import {
    DownloadIcon,
    ExternalLinkIcon,
    FileIcon,
    ImageIcon
} from 'lucide-react';
import React, { useState } from 'react';
import { formatFileSize } from '../../lib/chatUtils';
import { Dialog, DialogContent, DialogTrigger } from './dialog';

export const FileAttachment = ({ file }) => {
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  const isImage = file.type === 'image';
  const Icon = isImage ? ImageIcon : FileIcon;

  return (
    <div className="group relative flex items-center gap-2 p-2 bg-accent/50 rounded-lg max-w-sm hover:bg-accent transition-colors">
      <Icon className="h-5 w-5 text-muted-foreground" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {file.name}
        </p>
        {file.size && (
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {isImage ? (
          <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
            <DialogTrigger asChild>
              <button
                className="p-1 hover:bg-accent rounded"
                aria-label="Preview image"
              >
                <ExternalLinkIcon className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <img
                src={file.url}
                alt={file.name}
                className="w-full h-auto"
                loading="lazy"
              />
            </DialogContent>
          </Dialog>
        ) : (
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-accent rounded"
            aria-label="Download file"
          >
            <DownloadIcon className="h-4 w-4" />
          </a>
        )}
      </div>

      {isImage && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg flex items-center justify-center">
          <button
            onClick={() => setIsImagePreviewOpen(true)}
            className="text-white text-sm hover:underline"
          >
            Preview Image
          </button>
        </div>
      )}
    </div>
  );
};