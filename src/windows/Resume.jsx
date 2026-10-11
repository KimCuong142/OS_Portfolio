import { WindowControls } from "#components";
import WindowWrapper from "#hoc/WindowWrapper";
import { Download } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { useState, useEffect } from "react";
import useWindowStore from "#store/window";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const Resume = () => {
  const isOpen = useWindowStore((s) => s.windows.resume?.isOpen);
  const [pageWidth, setPageWidth] = useState(
    typeof window !== "undefined" ? Math.min(window.innerWidth - 36, 620) : 600
  );

  useEffect(() => {
    const handleResize = () => {
      setPageWidth(Math.min(window.innerWidth - 36, 620));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <div id="window-header">
        <WindowControls target="resume" />

        <h2>Resume.pdf</h2>

        <a
          href="files/resume.pdf"
          download
          className="cursor-pointer"
          title="Download resume"
        >
          <Download className="icon" />
        </a>
      </div>

      <div className="flex-1 overflow-y-auto flex justify-center bg-gray-100 p-2 sm:p-4">
        {isOpen && (
          <Document file="files/resume.pdf">
            <Page
              pageNumber={1}
              renderTextLayer
              renderAnnotationLayer
              width={pageWidth}
            />
          </Document>
        )}
      </div>
    </>
  );
};

const ResumeWindow = WindowWrapper(Resume, "resume");

export default ResumeWindow;
