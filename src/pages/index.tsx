import { useState, FormEvent, ChangeEvent } from 'react';
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [text, setText] = useState<string>('');
  const [suggestionsList, setSuggestionsList] = useState<string[]>([]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const response = await fetch('/api/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    // Split and trim the suggestions if they're in a single string format
    const suggestionsArray = data.suggestions.split(/\d+\./).slice(1).map((s: string) => s.trim());
    setSuggestionsList(suggestionsArray);

    console.log(suggestionsArray);
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const suggestionContainerClass = suggestionsList.length
    ? 'text-left align-top overflow-auto'
    : 'flex items-center justify-center';

  return (
    <main
      className={`flex h-screen items-center justify-center p-4 ${inter.className}`}
      style={{ fontFamily: '"Inter", sans-serif' }}
    >
      <div className="flex w-full max-w-4xl h-3/4 flex-col">
        <h1 className="text-3xl text-center mb-4">This is <span className="font-bold">Yapper.</span> It helps you learn, fast. 🗣️🗣️🗣️</h1>
        <p className="text-lg text-center mb-5">Enter your text below to receive suggestions on how to improve its clarity, style, and overall quality.</p>
        <div className="flex flex-1">
          <div className="flex-1 flex flex-col justify-center p-5">
            <form className="relative h-full" onSubmit={handleSubmit}>
              <textarea
                className="w-full p-4 h-full text-black bg-white rounded-lg shadow focus:outline-none focus:ring focus:ring-opacity-50 resize-none"
                rows={10}
                placeholder="Enter text here..."
                value={text}
                onChange={handleChange}
              ></textarea>
              <button
                type="submit"
                className="absolute bottom-0 left-0 mb-5 ml-4 px-4 py-2 text-white bg-black rounded opacity-75 hover:opacity-100 focus:outline-none focus:ring focus:ring-opacity-50 transition-opacity"
              >
                Submit
              </button>
            </form>
          </div>
          <div className="flex-1 flex flex-col justify-center p-5 text-gray-500">
            <div className={`p-4 bg-white rounded-lg shadow ${suggestionContainerClass}`}>
              {suggestionsList.length > 0 ? (
                <ol className="list-decimal list-inside">
                  {suggestionsList.map((suggestion, index) => (
                    <li key={index} className="mb-2">{suggestion}</li>
                  ))}
                </ol>
              ) : (
                'Your suggestions will appear here...'
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-center mt-5">Note: This version is currently utilizing GPT-3.5-turbo and may not reflect final quality.</p>
      </div>
    </main>
  );
}
