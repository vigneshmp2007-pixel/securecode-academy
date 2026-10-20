import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// react-markdown does not render raw HTML by default, so lesson text cannot inject script.
export default function Markdown({ children }) {
  return <div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown></div>;
}
