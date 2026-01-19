'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile, uploadAvatar, removeAvatar } from '@/lib/profile/actions';
import { Loader2, Camera, X, Check, Pencil } from 'lucide-react';
import type { User } from '@/lib/database.types';

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getInitials = () => {
    if (user.display_name) {
      return user.display_name.charAt(0).toUpperCase();
    }
    return user.email?.charAt(0).toUpperCase() || 'U';
  };

  const handleSaveName = async () => {
    setIsSavingName(true);
    setError(null);
    setSuccess(null);

    const result = await updateProfile({ display_name: displayName || null });

    if (result.success) {
      setSuccess('Name updated successfully');
      setIsEditingName(false);
      startTransition(() => {
        router.refresh();
      });
    } else {
      setError(result.error || 'Failed to update name');
    }

    setIsSavingName(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('avatar', file);

    const result = await uploadAvatar(formData);

    if (result.success) {
      setSuccess('Profile picture updated');
      startTransition(() => {
        router.refresh();
      });
    } else {
      setError(result.error || 'Failed to upload picture');
    }

    setIsUploadingAvatar(false);
    // Reset input
    e.target.value = '';
  };

  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true);
    setError(null);
    setSuccess(null);

    const result = await removeAvatar();

    if (result.success) {
      setSuccess('Profile picture removed');
      startTransition(() => {
        router.refresh();
      });
    } else {
      setError(result.error || 'Failed to remove picture');
    }

    setIsRemovingAvatar(false);
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Avatar className="w-20 h-20 ring-2 ring-blue-500/20 ring-offset-2 ring-offset-white dark:ring-offset-zinc-800">
            {user.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={user.display_name || user.email} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          {/* Upload overlay */}
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={isUploadingAvatar}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {isUploadingAvatar ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAvatarClick}
            disabled={isUploadingAvatar}
          >
            {isUploadingAvatar ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Change Picture
              </>
            )}
          </Button>

          {user.avatar_url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveAvatar}
              disabled={isRemovingAvatar}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {isRemovingAvatar ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Remove Picture
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Display Name Section */}
      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="flex-1"
              autoFocus
            />
            <Button
              type="button"
              size="icon"
              onClick={handleSaveName}
              disabled={isSavingName}
            >
              {isSavingName ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => {
                setIsEditingName(false);
                setDisplayName(user.display_name || '');
              }}
              disabled={isSavingName}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 py-2 px-3 bg-zinc-100 dark:bg-zinc-900 rounded-md text-zinc-900 dark:text-white">
              {user.display_name || <span className="text-zinc-400">Not set</span>}
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setIsEditingName(true)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        )}
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This name will be shown instead of your email address.
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          {success}
        </div>
      )}
    </div>
  );
}
