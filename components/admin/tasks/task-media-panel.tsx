'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageSquare, Image, FileText, Send, Trash2 } from 'lucide-react';
import type { PhotoWithUser } from '@/lib/photos/actions';
import type { FileWithUser } from '@/lib/files/actions';
import type { CommentWithUser } from '@/lib/comments/actions';

interface TaskMediaPanelProps {
  taskId: string;
}

export function TaskMediaPanel({ taskId }: TaskMediaPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [photos, setPhotos] = useState<PhotoWithUser[]>([]);
  const [files, setFiles] = useState<FileWithUser[]>([]);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    const [photosRes, filesRes, commentsRes] = await Promise.all([
      supabase
        .from('photos')
        .select('*, user:users(id, email)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false }),
      supabase
        .from('files')
        .select('*, user:users(id, email)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false }),
      supabase
        .from('comments')
        .select('*, user:users(id, email)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false }),
    ]);

    setPhotos((photosRes.data || []) as PhotoWithUser[]);
    setFiles((filesRes.data || []) as FileWithUser[]);
    setComments((commentsRes.data || []) as CommentWithUser[]);
    setIsLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSubmittingComment(false);
      return;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        content: newComment.trim(),
      } as never)
      .select('*, user:users(id, email)')
      .single();

    if (!error && data) {
      setComments(prev => [data as CommentWithUser, ...prev]);
      setNewComment('');
    }

    setIsSubmittingComment(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsUploadingPhoto(false);
      return;
    }

    // Upload to storage
    const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, file, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
      });

    if (uploadError) {
      setIsUploadingPhoto(false);
      e.target.value = '';
      return;
    }

    // Create record
    const { data, error: recordError } = await supabase
      .from('photos')
      .insert({
        task_id: taskId,
        user_id: user.id,
        storage_path: fileName,
        timestamp: new Date().toISOString(),
      } as never)
      .select('*, user:users(id, email)')
      .single();

    if (!recordError && data) {
      setPhotos(prev => [data as PhotoWithUser, ...prev]);
    }

    setIsUploadingPhoto(false);
    e.target.value = '';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsUploadingFile(false);
      return;
    }

    // Upload to storage
    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(fileName, file, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
      });

    if (uploadError) {
      setIsUploadingFile(false);
      e.target.value = '';
      return;
    }

    // Create record
    const { data, error: recordError } = await supabase
      .from('files')
      .insert({
        task_id: taskId,
        user_id: user.id,
        storage_path: fileName,
        file_name: file.name,
        file_size: file.size,
      } as never)
      .select('*, user:users(id, email)')
      .single();

    if (!recordError && data) {
      setFiles(prev => [data as FileWithUser, ...prev]);
    }

    setIsUploadingFile(false);
    e.target.value = '';
  };

  const handleDeletePhoto = async (photoId: string, storagePath: string) => {
    const supabase = createClient();

    // Delete from storage
    await supabase.storage.from('photos').remove([storagePath]);

    // Delete record
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId);

    if (!error) {
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    }
  };

  const handleDeleteFile = async (fileId: string, storagePath: string) => {
    const supabase = createClient();

    // Delete from storage
    await supabase.storage.from('files').remove([storagePath]);

    // Delete record
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (!error) {
      setFiles(prev => prev.filter(f => f.id !== fileId));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  const getPhotoUrl = (storagePath: string) => {
    const supabase = createClient();
    const { data } = supabase.storage.from('photos').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const getFileUrl = (storagePath: string) => {
    const supabase = createClient();
    const { data } = supabase.storage.from('files').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="comments" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="comments" className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Comments ({comments.length})
        </TabsTrigger>
        <TabsTrigger value="photos" className="flex items-center gap-2">
          <Image className="w-4 h-4" />
          Photos ({photos.length})
        </TabsTrigger>
        <TabsTrigger value="files" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Files ({files.length})
        </TabsTrigger>
      </TabsList>

      {/* Comments Tab */}
      <TabsContent value="comments" className="mt-4 space-y-4">
        {/* Add Comment */}
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="flex-1"
          />
          <Button
            onClick={handleAddComment}
            disabled={isSubmittingComment || !newComment.trim()}
            size="icon"
            className="self-end"
          >
            {isSubmittingComment ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Comments List */}
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.user?.email || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => handleDeleteComment(comment.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </TabsContent>

      {/* Photos Tab */}
      <TabsContent value="photos" className="mt-4 space-y-4">
        {/* Upload Photo */}
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={isUploadingPhoto}
            className="hidden"
            id="photo-upload"
          />
          <Button asChild variant="outline" disabled={isUploadingPhoto}>
            <label htmlFor="photo-upload" className="cursor-pointer">
              {isUploadingPhoto ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Image className="w-4 h-4 mr-2" />
                  Upload Photo
                </>
              )}
            </label>
          </Button>
        </div>

        {/* Photos Grid */}
        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 col-span-3">No photos yet</p>
          ) : (
            photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPhotoUrl(photo.storage_path)}
                  alt="Task photo"
                  className="w-full h-full object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeletePhoto(photo.id, photo.storage_path)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </TabsContent>

      {/* Files Tab */}
      <TabsContent value="files" className="mt-4 space-y-4">
        {/* Upload File */}
        <div>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
            onChange={handleFileUpload}
            disabled={isUploadingFile}
            className="hidden"
            id="file-upload"
          />
          <Button asChild variant="outline" disabled={isUploadingFile}>
            <label htmlFor="file-upload" className="cursor-pointer">
              {isUploadingFile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Upload File
                </>
              )}
            </label>
          </Button>
        </div>

        {/* Files List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No files yet</p>
          ) : (
            files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <FileText className="w-8 h-8 text-zinc-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <a
                    href={getFileUrl(file.storage_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm hover:underline truncate block"
                  >
                    {file.file_name}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)} • {file.user?.email || 'Unknown'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => handleDeleteFile(file.id, file.storage_path)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
