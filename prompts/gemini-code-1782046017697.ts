import React, { useMemo } from 'react';
import { md } from './markdownConfig';

interface PreviewProps {
  markdownState: string;
}

export const MarkdownPreview: React.FC<PreviewProps> = ({ markdownState }) => {
  // Optimisation des performances pour les gros documents
  const renderedHtml = useMemo(() => {
    return md.render(markdownState);
  }, [markdownState]);

  return (
    <div 
      className="markdown-preview-body"
      dangerouslySetInnerHTML={{ __html: renderedHtml }} 
    />
  );
};