'use client';

import { useState, useRef } from 'react';
import type { Branding } from '@/lib/database.types';
import { saveBranding, uploadLogo, deleteOldLogo } from '@/lib/branding/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Trash2, CheckCircle2 } from 'lucide-react';

interface BrandingFormProps {
  initialBranding: Branding | null;
}

export function BrandingForm({ initialBranding }: BrandingFormProps) {
  const [logoUrl, setLogoUrl] = useState(initialBranding?.logo_url || '');
  const [primaryColor, setPrimaryColor] = useState(initialBranding?.primary_color || '#3b82f6');
  const [accentColor, setAccentColor] = useState(initialBranding?.accent_color || '#10b981');
  const [appName, setAppName] = useState(initialBranding?.app_name || 'FieldOps');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Logo must be less than 5MB' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadLogo(formData);

      if (result.success && result.data) {
        // Delete old logo if exists
        if (logoUrl) {
          await deleteOldLogo(logoUrl);
        }
        setLogoUrl(result.data);
        setMessage({ type: 'success', text: 'Logo uploaded successfully' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to upload logo' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload logo' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (logoUrl) {
      await deleteOldLogo(logoUrl);
    }
    setLogoUrl('');
    setMessage({ type: 'success', text: 'Logo removed' });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const result = await saveBranding({
        logo_url: logoUrl || null,
        primary_color: primaryColor,
        accent_color: accentColor,
        app_name: appName,
      });

      if (result.success) {
        setMessage({ type: 'success', text: 'Branding settings saved successfully' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save settings' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate contrasting text color
  const getContrastColor = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Settings Section */}
      <div className="space-y-6">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Company Logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {logoUrl ? (
              <div className="relative w-48 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-48 h-24 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground text-sm">No logo uploaded</span>
              </div>
            )}

            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button asChild disabled={isUploading}>
                  <span>
                    {isUploading ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload />
                        {logoUrl ? 'Change Logo' : 'Upload Logo'}
                      </>
                    )}
                  </span>
                </Button>
              </label>

              {logoUrl && (
                <Button variant="outline" onClick={handleRemoveLogo}>
                  <Trash2 />
                  Remove
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Recommended: Square PNG, max 5MB. Logo will appear in the header and as the app icon on home screens.
            </p>
          </CardContent>
        </Card>

        {/* Color Pickers */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Colors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border-2 border-input cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  placeholder="#3b82f6"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Used for buttons and header background
              </p>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="accentColor"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border-2 border-input cursor-pointer"
                  style={{ backgroundColor: accentColor }}
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  placeholder="#10b981"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Used for status badges, links, and highlights
              </p>
            </div>
          </CardContent>
        </Card>

        {/* App Name */}
        <Card>
          <CardHeader>
            <CardTitle>App Name</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="appName">Application Name</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="FieldOps"
            />
            <p className="text-sm text-muted-foreground">
              Shown in the header and PWA install prompt
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="flex-1">
              {message.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Preview Section */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* App Icon Preview */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">App Icon (Home Screen)</p>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt="App Icon Preview"
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <span
                      className="text-2xl font-bold"
                      style={{ color: getContrastColor(primaryColor) }}
                    >
                      {appName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{appName}</p>
                  <p>How it appears on home screens</p>
                </div>
              </div>
            </div>

            {/* Header Preview */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Header</p>
              <div
                className="rounded-lg p-4 flex items-center justify-between"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      className="h-8 object-contain"
                      style={{ maxWidth: '120px' }}
                    />
                  ) : (
                    <div className="h-8 w-8 bg-white/20 rounded flex items-center justify-center">
                      <span style={{ color: getContrastColor(primaryColor) }} className="text-xs font-bold">
                        {appName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span
                    className="font-semibold"
                    style={{ color: getContrastColor(primaryColor) }}
                  >
                    {appName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm"
                    style={{ color: getContrastColor(primaryColor), opacity: 0.8 }}
                  >
                    user@example.com
                  </span>
                </div>
              </div>
            </div>

            {/* Button Preview */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Buttons</p>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: primaryColor,
                    color: getContrastColor(primaryColor),
                  }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 rounded-lg font-medium border-2"
                  style={{
                    borderColor: primaryColor,
                    color: primaryColor,
                  }}
                >
                  Secondary
                </button>
              </div>
            </div>

            {/* Status Badge Preview */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Status Badges</p>
              <div className="flex gap-2 flex-wrap">
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: accentColor,
                    color: getContrastColor(accentColor),
                  }}
                >
                  Active
                </span>
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium border"
                  style={{
                    borderColor: accentColor,
                    color: accentColor,
                  }}
                >
                  In Progress
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-muted text-muted-foreground">
                  Pending
                </span>
              </div>
            </div>

            {/* Links Preview */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Links & Highlights</p>
              <p>
                This is regular text with a{' '}
                <span
                  className="underline cursor-pointer"
                  style={{ color: accentColor }}
                >
                  highlighted link
                </span>{' '}
                in the middle.
              </p>
            </div>

            {/* Task Card Preview */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Task Card</p>
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">Sample Task</h4>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: accentColor,
                      color: getContrastColor(accentColor),
                    }}
                  >
                    In Progress
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  This is a sample task description to show how cards will appear.
                </p>
                <div className="flex gap-2">
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${primaryColor}20`,
                      color: primaryColor,
                    }}
                  >
                    Division A
                  </span>
                  <span className="text-xs text-muted-foreground">Due: Tomorrow</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Swatch */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div
                  className="w-full h-16 rounded-lg mb-2"
                  style={{ backgroundColor: primaryColor }}
                />
                <p className="text-sm font-medium">Primary</p>
                <p className="text-xs text-muted-foreground font-mono">{primaryColor}</p>
              </div>
              <div>
                <div
                  className="w-full h-16 rounded-lg mb-2"
                  style={{ backgroundColor: accentColor }}
                />
                <p className="text-sm font-medium">Accent</p>
                <p className="text-xs text-muted-foreground font-mono">{accentColor}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
