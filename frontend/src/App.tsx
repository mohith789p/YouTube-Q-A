import { useState } from 'react';
import axios from 'axios';
import UrlIngestion from './pages/urlInterface';
import ChatInterface, { type Message } from './pages/chatInterface';

interface IngestResponse {
  status: string;
  video_id: string;
  title: string;
  message: string;
}

interface ChatResponse {
  answer: string;
  sources: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const App = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFinish, setIsFinish] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Track active video ID and meta
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState<string | null>(null);

  const handleIngest = async (url: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await axios.post<IngestResponse>(
        `${API_BASE_URL}/api/v1/ingest`,
        { url },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Extract metadata from backend response
      const { video_id, title } = response.data;
      setActiveVideoId(video_id);
      setActiveVideoTitle(title);

      setIsFinish(true);
      console.log('Successfully ingested video ID:', video_id);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        const detail = error.response.data?.detail;
        setErrorMessage(typeof detail === 'string' ? detail : 'Failed to extract video transcript.');
      } else {
        setErrorMessage('Server connection error. Ensure FastAPI is running.');
      }
      setIsFinish(false);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || !activeVideoId) return;

    const formattedTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: message,
      timestamp: formattedTime,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);

    try {

      const response = await axios.post<ChatResponse>(
        `${API_BASE_URL}/api/v1/chat`,
        {
          video_id: activeVideoId,
          message: message,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // 3. Append assistant reply
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: response.data.answer,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: unknown) {
      const errorDetail = axios.isAxiosError(error) && error.response
        ? error.response.data?.detail
        : 'Failed to generate answer. Please try again.';

      const systemErrorMessage: Message = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: `Error: ${typeof errorDetail === 'string' ? errorDetail : 'Failed to generate answer. Please try again.'}`,
        timestamp: formattedTime,
      };

      setMessages((prev) => [...prev, systemErrorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setActiveVideoId(null);
    setIsFinish(false);
  };

  const clear = () => {
    setMessages([]);
  };

  return (
    <main className="h-screen w-full flex flex-col overflow-hidden bg-gray-950">
      {!isFinish ? (
        <UrlIngestion
          onIngest={handleIngest}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      ) : (
        <ChatInterface
          videoTitle={activeVideoTitle}
          onSendMessage={sendMessage}
          messages={messages}
          isGenerating={isGenerating}
          onReset={reset}
          onClear={clear}
        />
      )}
    </main>
  );
};

export default App;