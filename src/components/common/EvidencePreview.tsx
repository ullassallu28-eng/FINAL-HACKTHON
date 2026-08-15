import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, Image, FileText } from "lucide-react";
import { isImageFile, isPdfFile, resolveMediaUrl } from "../../utils/mediaUrl";
import { useTranslation } from "../../context/LocaleContext";

interface EvidencePreviewProps {
  fileName: string;
  fileUrl: string;
  notes?: string;
  compact?: boolean;
}

export const EvidencePreview: React.FC<EvidencePreviewProps> = ({
  fileName,
  fileUrl,
  notes,
  compact = false,
}) => {
  const { t } = useTranslation();
  const mediaUrl = resolveMediaUrl(fileUrl);
  const showImage = mediaUrl && isImageFile(fileName || mediaUrl);
  const showPdf = mediaUrl && isPdfFile(fileName || mediaUrl);
  const [imageFailed, setImageFailed] = useState(false);
  const [shouldLoadImage, setShouldLoadImage] = useState(compact);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (compact || !showImage || shouldLoadImage) return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadImage(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [compact, showImage, shouldLoadImage]);

  if (!mediaUrl) {
    return (
      <div className="evidence-file-card">
        <Image size={24} className="file-icon" />
        <div className="evidence-file-meta">
          <strong className="file-name">{fileName}</strong>
          <span className="text-muted">{t("vet.evidence.unavailable")}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`evidence-file-card evidence-file-card-rich ${compact ? "evidence-compact" : ""}`}
    >
      {showImage && !imageFailed ? (
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="evidence-thumb-link"
        >
          {shouldLoadImage ? (
            <img
              src={mediaUrl}
              alt={fileName}
              className="evidence-thumb-image"
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="evidence-thumb-placeholder" aria-hidden>
              <Image size={24} className="file-icon" />
            </div>
          )}
        </a>
      ) : showPdf ? (
        <FileText size={32} className="file-icon" />
      ) : (
        <Image size={24} className="file-icon" />
      )}
      <div className="evidence-file-meta">
        <strong className="file-name">{fileName}</strong>
        {imageFailed && (
          <span className="text-muted evidence-load-fail">{t("vet.evidence.reloadHint")}</span>
        )}
        {notes && <p className="evidence-notes-preview">{notes}</p>}
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="evidence-open-link"
        >
          <ExternalLink size={14} />
          {t("vet.evidence.open")}
        </a>
      </div>
    </div>
  );
};
