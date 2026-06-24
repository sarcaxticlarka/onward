import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '../ui/Button'

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface VoiceInputButtonProps {
  onResult: (transcript: string) => void
}

export function VoiceInputButton({ onResult }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      setSupported(false)
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      if (transcript) onResult(transcript)
    }
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
  }, [onResult])

  if (!supported) return null

  const toggleListening = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  return (
    <Button
      type="button"
      variant={isListening ? 'danger' : 'secondary'}
      size="md"
      onClick={toggleListening}
      aria-label="Push to talk"
    >
      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
    </Button>
  )
}
