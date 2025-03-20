import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Progress } from '../ui/Progress';
import { toast } from 'react-hot-toast';

const ProjectSubmission = ({ project, onSubmit }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size <= 50 * 1024 * 1024) { // 50MB limit
      setFile(selectedFile);
    } else {
      toast.error('File size must be less than 50MB');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      // Simulated upload progress
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(r => setTimeout(r, 200));
      }

      await onSubmit(file);
      toast.success('Project submitted successfully!');
      setFile(null);
    } catch (error) {
      toast.error('Failed to submit project');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Submit Project</h3>
      
      <div className="space-y-4">
        <div className="p-4 border-2 border-dashed rounded-lg text-center">
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="project-file"
            accept=".pdf,.doc,.docx,.zip,.rar"
            disabled={uploading}
          />
          <label
            htmlFor="project-file"
            className="cursor-pointer block p-4 text-gray-600 hover:text-gray-800"
          >
            {file ? (
              <span className="text-blue-600">{file.name}</span>
            ) : (
              <>
                <span className="block text-3xl mb-2">📁</span>
                <span>Drop your file here or click to browse</span>
                <span className="block text-sm mt-1 text-gray-500">
                  Supported formats: PDF, DOC, DOCX, ZIP, RAR (Max 50MB)
                </span>
              </>
            )}
          </label>
        </div>

        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-gray-500">
              Uploading... {progress}%
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="btn-primary"
          >
            {uploading ? 'Uploading...' : 'Submit Project'}
          </button>
        </div>
      </div>
    </Card>
  );
};

export default ProjectSubmission;
