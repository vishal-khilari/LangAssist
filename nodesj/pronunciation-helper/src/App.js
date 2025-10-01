import React, { useState, useEffect } from 'react';
import { Mic, Volume2, CheckCircle, XCircle, Info } from 'lucide-react';

export default function PronunciationHelper() {
  const [targetWord, setTargetWord] = useState('hello');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const [browserSupport, setBrowserSupport] = useState(true);

  const wordList = [
    { word: 'hello', phonetic: '/həˈloʊ/' },
    { word: 'world', phonetic: '/wɜːrld/' },
    { word: 'pronunciation', phonetic: '/prəˌnʌnsiˈeɪʃən/' },
    { word: 'beautiful', phonetic: '/ˈbjuːtɪfəl/' },
    { word: 'language', phonetic: '/ˈlæŋɡwɪdʒ/' },
    { word: 'development', phonetic: '/dɪˈveləpmənt/' },
    { word: 'chocolate', phonetic: '/ˈtʃɒklət/' },
    { word: 'restaurant', phonetic: '/ˈrestərɑːnt/' }
  ];

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setBrowserSupport(false);
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      setTranscript(spokenText);
      checkPronunciation(spokenText);
      setIsListening(false);
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      setFeedback({ type: 'error', message: 'Error: ' + event.error });
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);
  }, [targetWord]);

  const normalizeText = (text) => {
    return text.toLowerCase().trim().replace(/[^a-z]/g, '');
  };

  const calculateSimilarity = (str1, str2) => {
    if (str1 === str2) return 1.0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(str1, str2);
    return (longer.length - editDistance) / longer.length;
  };

  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const checkPronunciation = (spokenText) => {
    const normalizedSpoken = normalizeText(spokenText);
    const normalizedTarget = normalizeText(targetWord);
    
    console.log('Raw spoken:', spokenText);
    console.log('Normalized spoken:', normalizedSpoken);
    console.log('Normalized target:', normalizedTarget);
    
    // Check for exact match
    if (normalizedSpoken === normalizedTarget) {
      setFeedback({
        type: 'success',
        message: 'Perfect! Your pronunciation is exactly right.',
        score: 100
      });
      return;
    }
    
    // Calculate similarity
    const similarity = calculateSimilarity(normalizedSpoken, normalizedTarget);
    console.log('Similarity score:', similarity);
    
    const score = Math.round(similarity * 100);
    
    if (similarity >= 0.85) {
      setFeedback({
        type: 'success',
        message: 'Excellent! Your pronunciation is correct.',
        score: score
      });
    } else if (similarity >= 0.65) {
      setFeedback({
        type: 'warning',
        message: `Good attempt! You said: "${spokenText}". Try again for better accuracy.`,
        score: score
      });
    } else {
      setFeedback({
        type: 'error',
        message: `Not quite. You said: "${spokenText}". Listen and try again.`,
        score: score
      });
    }
  };

  const startListening = () => {
    if (!recognition) return;
    
    setTranscript('');
    setFeedback(null);
    setIsListening(true);
    recognition.start();
  };

  const speakWord = () => {
    const utterance = new SpeechSynthesisUtterance(targetWord);
    utterance.rate = 0.8;
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  const currentWordObj = wordList.find(w => w.word === targetWord);

  if (!browserSupport) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <Info className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-center mb-4">Browser Not Supported</h2>
          <p className="text-gray-700 text-center">
            Your browser doesn't support the Web Speech API. Please use Chrome, Edge, or Safari.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-purple-900">
          Pronunciation Helper
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Practice your pronunciation and get instant feedback
        </p>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select a word to practice:
            </label>
            <select
              value={targetWord}
              onChange={(e) => {
                setTargetWord(e.target.value);
                setTranscript('');
                setFeedback(null);
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {wordList.map((item) => (
                <option key={item.word} value={item.word}>
                  {item.word}
                </option>
              ))}
            </select>
          </div>

          <div className="text-center mb-6">
            <div className="inline-block bg-purple-50 rounded-lg p-6">
              <h2 className="text-5xl font-bold text-purple-900 mb-2">
                {targetWord}
              </h2>
              <p className="text-gray-600 text-lg">{currentWordObj?.phonetic}</p>
            </div>
          </div>

          <div className="flex gap-4 justify-center mb-6">
            <button
              onClick={speakWord}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Volume2 className="w-5 h-5" />
              Listen
            </button>

            <button
              onClick={startListening}
              disabled={isListening}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              <Mic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
              {isListening ? 'Listening...' : 'Try It'}
            </button>
          </div>

          {transcript && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">You said:</p>
              <p className="text-lg font-medium text-gray-900">{transcript}</p>
            </div>
          )}

          {feedback && (
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${
                feedback.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : feedback.type === 'warning'
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              ) : (
                <XCircle className={`w-6 h-6 ${feedback.type === 'warning' ? 'text-yellow-600' : 'text-red-600'} flex-shrink-0 mt-1`} />
              )}
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    feedback.type === 'success'
                      ? 'text-green-900'
                      : feedback.type === 'warning'
                      ? 'text-yellow-900'
                      : 'text-red-900'
                  }`}
                >
                  {feedback.message}
                </p>
                {feedback.score !== undefined && (
                  <p className="text-sm text-gray-600 mt-1">
                    Accuracy: {feedback.score}%
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-semibold text-lg mb-2 text-gray-900">How to use:</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>Select a word from the dropdown menu</li>
            <li>Click "Listen" to hear the correct pronunciation</li>
            <li>Click "Try It" and speak the word clearly</li>
            <li>Get instant feedback on your pronunciation</li>
          </ol>
          <p className="mt-4 text-sm text-gray-600">
            <strong>Tip:</strong> Open browser console (F12) to see debug info if accuracy seems wrong.
          </p>
        </div>
      </div>
    </div>
  );
}