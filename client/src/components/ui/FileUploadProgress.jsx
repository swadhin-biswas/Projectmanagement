import { XIcon } from 'lucide-react';
import React from 'react';
import { formatFileSize } from '../../lib/chatUtils';
import { Progress } from './progress';

export const FileUploadProgress = ({
  file,
  progress,
  onCancel
}) => {
  return (
    <div className="flex items-center gap-4 p-2 bg-background rounded border">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate max-w-[200px]">
            {file.name}
          </span>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Cancel upload"
          >
            <XIcon size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={progress} className="flex-1" />
          <span className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </span>
          <span className="text-xs text-muted-foreground min-w-[40px]">
            {progress}%
          </span>
        </div>
      </div>
    </div>
  );
};