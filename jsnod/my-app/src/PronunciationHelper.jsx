import React, { useState, useRef } from 'react';

export default function PronunciationHelper() {
  const [targetWord, setTargetWord] = useState('pronunciation');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const recognitionRef = useRef(null);

  const wordList = [
    'pronunciation', 'necessary', 'particularly', 'literature', 
    'comfortable', 'maintenance', 'schedule', 'restaurant',
    'Massachusetts', 'Mediterranean', 'entrepreneur', 'worcestershire'
  ];

  const speakWord = () => {
    const utterance = new SpeechSynthesisUtterance(targetWord);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const calculateSimilarity = (str1, str2) => {
    str1 = str1.toLowerCase().replace(/[^a-z]/g, '');
    str2 = str2.toLowerCase().replace(/[^a-z]/g, '');
    
    if (str1 === str2) return 100;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (shorter[i] === longer[i]) matches++;
    }
    
    const lengthPenalty = Math.abs(str1.length - str2.length) * 5;
    const similarity = (matches / longer.length) * 100 - lengthPenalty;
    
    return Math.max(0, Math.round(similarity));
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setFeedback({
        type: 'error',
        message: 'Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.'
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setFeedback(null);
    };

    recognitionRef.current.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      setTranscript(spokenText);
      
      const similarity = calculateSimilarity(spokenText, targetWord);
      
      let feedbackData;
      if (similarity >= 85) {
        feedbackData = {
          type: 'success',
          message: 'Excellent! Perfect pronunciation! 🎉',
          score: similarity
        };
      } else if (similarity >= 60) {
        feedbackData = {
          type: 'warning',
          message: 'Good attempt! Close, but try again.',
          score: similarity,
          tip: 'Listen carefully and try to match the sounds.'
        };
      } else {
        feedbackData = {
          type: 'error',
          message: 'Not quite right. Listen and try again.',
          score: similarity,
          tip: 'Click the speaker icon to hear the correct pronunciation.'
        };
      }
      
      setFeedback(feedbackData);
      setAttempts(prev => [...prev, { word: spokenText, score: similarity, target: targetWord }]);
    };

    recognitionRef.current.onerror = (event) => {
      setIsListening(false);
      setFeedback({
        type: 'error',
        message: `Error: ${event.error}. Please check your microphone.`
      });
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const getFeedbackColor = (type) => {
    switch(type) {
      case 'success': return 'bg-green-100 border-green-500 text-green-800';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'error': return 'bg-red-100 border-red-500 text-red-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getFeedbackIcon = (type) => {
    const iconStyle = "w-6 h-6";
    switch(type) {
      case 'success': 
        return (
          <svg className={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning': 
        return (
          <svg className={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'error': 
        return (
          <svg className={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Pronunciation Helper
          </h1>
          <p className="text-center text-gray-600 mb-8">Practice and perfect your pronunciation</p>
          
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
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
            >
              {wordList.map(word => (
                <option key={word} value={word}>{word}</option>
              ))}
            </select>
          </div>

          <div className="bg-purple-50 rounded-xl p-6 mb-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Target Word:</p>
            <h2 className="text-3xl font-bold text-purple-700 mb-4">{targetWord}</h2>
            <button
              onClick={speakWord}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              Hear Pronunciation
            </button>
          </div>

          <div className="text-center mb-6">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isListening}
              className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-semibold transition-all ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
              }`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {isListening ? 'Listening...' : 'Start Speaking'}
            </button>
            {isListening && (
              <p className="text-sm text-gray-500 mt-3">Speak the word clearly into your microphone</p>
            )}
          </div>

          {transcript && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">You said:</p>
              <p className="text-xl font-semibold text-gray-800">{transcript}</p>
            </div>
          )}

          {feedback && (
            <div className={`border-l-4 rounded-lg p-4 mb-6 ${getFeedbackColor(feedback.type)}`}>
              <div className="flex items-start gap-3">
                {getFeedbackIcon(feedback.type)}
                <div className="flex-1">
                  <p className="font-semibold mb-1">{feedback.message}</p>
                  {feedback.score !== undefined && (
                    <p className="text-sm mb-2">Accuracy Score: {feedback.score}%</p>
                  )}
                  {feedback.tip && (
                    <p className="text-sm italic">{feedback.tip}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {attempts.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Recent Attempts:</h3>
              <div className="space-y-2">
                {attempts.slice(-5).reverse().map((attempt, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <span className="font-medium">{attempt.word}</span>
                      <span className="text-gray-500 text-sm ml-2">(target: {attempt.target})</span>
                    </div>
                    <div className={`font-bold ${
                      attempt.score >= 85 ? 'text-green-600' : 
                      attempt.score >= 60 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {attempt.score}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Tips for Success:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Speak clearly and at a normal pace</li>
            <li>• Ensure your microphone is working properly</li>
            <li>• Listen to the correct pronunciation first</li>
            <li>• Practice in a quiet environment</li>
          </ul>
        </div>
      </div>
    </div>
  );
}