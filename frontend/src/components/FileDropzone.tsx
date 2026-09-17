import { useRef, useState, type DragEvent } from "react";
import "./FileDropzone.css";

interface FileDropzoneProps {
  accept?: string;
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
}

export default function FileDropzone({ accept, onFileSelected, selectedFile }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }

  return (
    <div
      className={"dropzone" + (isDragActive ? " active" : "")}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="dropzone-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      {selectedFile ? (
        <div className="dropzone-file">
          <span className="dropzone-filename">{selectedFile.name}</span>
          <span className="dropzone-filesize">{(selectedFile.size / 1024).toFixed(0)} KB</span>
        </div>
      ) : (
        <div className="dropzone-empty">
          <p>Drag and drop a file here, or click to browse.</p>
          <p className="dropzone-hint">JPG, PNG, or PDF</p>
        </div>
      )}
    </div>
  );
}
