"use client";
import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import type { ImageQuestion } from '../types';

export function ImageQuestionView({ q, path, value, onChange, jsonPath }: {
    q: ImageQuestion;
    path: string;
    value: Record<string, unknown>;
    onChange: (v: unknown) => void;
    jsonPath: string;
}) {
    const [imageError, setImageError] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentValue = (value[path] as string) ?? q.url ?? '';

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('Image size must be less than 5MB');
            return;
        }

        setIsUploading(true);
        setImageError(false);

        try {
            // Convert image to base64
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64String = event.target?.result as string;
                onChange(base64String);
                setIsUploading(false);
            };
            reader.onerror = () => {
                setImageError(true);
                setIsUploading(false);
                alert('Failed to read image file');
            };
            reader.readAsDataURL(file);
        } catch (error) {
            setImageError(true);
            setIsUploading(false);
            alert('Failed to upload image');
        }
    };

    const handleRemoveImage = () => {
        onChange('');
        setImageError(false);
        setImageDimensions(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getEstimatedSize = (base64: string): string => {
        // Base64 adds ~33% overhead, so we estimate the original size
        const base64Length = base64.length - (base64.indexOf(',') + 1);
        const estimatedBytes = (base64Length * 3) / 4;
        return formatFileSize(estimatedBytes);
    };

    return (
        <div data-json-path={jsonPath}>
            <div className="mb-3">
                <Label className="block text-lg font-medium text-slate-900" data-json-path={`${jsonPath}.question`}>{q.question}</Label>
                {q.description ? (
                    <div className="mt-1 text-sm text-muted-foreground">{q.description}</div>
                ) : null}
            </div>

            <div className="space-y-4">
                {/* File Upload Input (Hidden) */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                />

                {/* Upload Button or Image Preview */}
                {!currentValue ? (
                    <div
                        onClick={handleBrowseClick}
                        className="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                        <svg
                            className="h-12 w-12 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                        <p className="mt-2 text-sm font-medium text-slate-700">
                            {isUploading ? 'Uploading...' : 'Click to upload image'}
                        </p>
                        <p className="text-xs text-slate-500">PNG, JPG, GIF up to 5MB</p>
                    </div>
                ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        {/* Image Info Bar */}
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
                            <div className="flex items-center gap-3 text-xs text-slate-600">
                                {imageDimensions && (
                                    <>
                                        <span className="font-medium">
                                            {imageDimensions.width} × {imageDimensions.height}
                                        </span>
                                        <span className="text-slate-400">•</span>
                                    </>
                                )}
                                <span>{getEstimatedSize(currentValue)}</span>
                            </div>
                            <button
                                onClick={handleRemoveImage}
                                className="text-xs text-red-600 hover:text-red-800 font-medium px-3 py-1 rounded border border-red-300 hover:border-red-400 transition-colors"
                            >
                                Remove
                            </button>
                        </div>

                        {/* Image Preview Container - Fixed to prevent cropping */}
                        <div className="p-4 flex justify-center items-center bg-white">
                            {!imageError ? (
                                <img
                                    src={currentValue}
                                    alt={q.question}
                                    className="rounded-md shadow-sm"
                                    onError={() => setImageError(true)}
                                    onLoad={handleImageLoad}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '600px',
                                        width: 'auto',
                                        height: 'auto',
                                        objectFit: 'contain'
                                    }}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-48 bg-slate-100 rounded-md border-2 border-dashed border-slate-300 w-full">
                                    <div className="text-center text-slate-500">
                                        <svg
                                            className="mx-auto h-12 w-12 text-slate-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <p className="mt-2 text-sm">Failed to load image</p>
                                        <p className="text-xs text-slate-400">Please try uploading again</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Change Image Button */}
                        <div className="px-4 pb-4">
                            <button
                                onClick={handleBrowseClick}
                                className="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-2 rounded border border-indigo-300 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                            >
                                Change Image
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ImageQuestionView;
