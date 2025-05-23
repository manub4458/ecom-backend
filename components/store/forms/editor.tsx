"use client";

import { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { toast } from "sonner";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const Editor: React.FC<EditorProps> = ({ value, onChange, disabled }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const isMounted = useRef(false);
  const isUpdating = useRef(false);

  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append("image", file);

        try {
          const response = await fetch("/api/upload-image", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const text = await response.text();
            console.error("Upload API error:", {
              status: response.status,
              responseText: text || "No response body",
            });
            throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`);
          }

          const text = await response.text();
          if (!text) {
            throw new Error("Empty response from server");
          }

          const data = JSON.parse(text);
          const imageUrl = data.url;

          const quill = quillRef.current;
          if (quill) {
            const range = quill.getSelection();
            if (range) {
              quill.insertEmbed(range.index, "image", imageUrl);
            }
          }
        } catch (error) {
          console.error("Image upload error:", error);
          toast.error(error instanceof Error ? error.message : "Failed to upload image");
        }
      }
    };
  };

  useEffect(() => {
    if (editorRef.current && !isMounted.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
        modules: {
          toolbar: {
            container: [
              [{ header: [1, 2, 3, false] }, { font: [] }],
              ["bold", "italic", "underline"],
              [{ list: "ordered" }, { list: "bullet" }],
              ["link", "image", "video"],
            ],
            handlers: {
              image: imageHandler,
            },
          },
        },
        placeholder: "Enter product description...",
      });

      isMounted.current = true;

      if (value) {
        quillRef.current.root.innerHTML = value;
      }

      quillRef.current.on("text-change", () => {
        if (!isUpdating.current) {
          const content = quillRef.current?.root.innerHTML || "";
          onChange(content);
        }
      });

      if (disabled) {
        quillRef.current.disable();
      } else {
        quillRef.current.enable();
      }
    }

    return () => {
      if (quillRef.current) {
        quillRef.current.off("text-change");
        quillRef.current = null;
        isMounted.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (quillRef.current && value !== quillRef.current.root.innerHTML) {
      isUpdating.current = true;
      quillRef.current.root.innerHTML = value || "";
      isUpdating.current = false;
    }
  }, [value]);

  useEffect(() => {
    if (quillRef.current) {
      if (disabled) {
        quillRef.current.disable();
      } else {
        quillRef.current.enable();
      }
    }
  }, [disabled]);

  return (
    <div className="bg-white">
      <div ref={editorRef} style={{ minHeight: "200px" }} />
    </div>
  );
};

export default Editor;