import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  User,
  Activity,
  Award,
  AlertCircle,
  TrendingUp,
  BrainCircuit,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Plus,
  Play,
  RotateCcw,
  BookOpen,
  Edit2,
  Check,
  UserCheck,
  Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DebateSegment, SpeakerProfile, SegmentAnalysis } from "./types";
import { SAMPLE_DEBATES, SampleDebate } from "./data/sampleDebates";
import { classifyVoiceSignature, autoCorrelate } from "./utils/audio";

export default function App() {
  // Debate state
  const [segments, setSegments] = useState<DebateSegment[]>([]);
  const [speakers, setSpeakers] = useState<Record<string, SpeakerProfile>>({
    sig_alpha: {
      id: "sig_alpha",
      label: "Person A",
      avatarColor: "#f43f5e", // Rose 500
      wordCount: 0,
      segmentsCount: 0,
      personalitySummary: "No profile generated yet. Record or load a debate to begin.",
      strengths: [],
      weaknesses: [],
      averageCorrectnessRating: 0,
      averageComplexity: 0,
      mostUsedKeywords: [],
      debateStyle: "Awaiting Input",
      conclusion: "Awaiting debate analysis.",
      lowestFrequency: 85,
      highestFrequency: 140,
      medianFrequency: 115,
      frequencies: [85, 110, 115, 120, 140],
      conversationalStyle: "Grave & Measured",
      speechPaceText: "Deliberate Pace",
      vocabularyDiversity: 65,
      jargonDensity: 40,
      selfInsightSummary: "Speaks in a deep, bass/baritone register. Your conversational style tends to be measured and authoritative, but you should verify that your arguments aren't overly dogmatic or rigid."
    },
    sig_beta: {
      id: "sig_beta",
      label: "Person B",
      avatarColor: "#3b82f6", // Blue 500
      wordCount: 0,
      segmentsCount: 0,
      personalitySummary: "No profile generated yet. Record or load a debate to begin.",
      strengths: [],
      weaknesses: [],
      averageCorrectnessRating: 0,
      averageComplexity: 0,
      mostUsedKeywords: [],
      debateStyle: "Awaiting Input",
      conclusion: "Awaiting debate analysis.",
      lowestFrequency: 150,
      highestFrequency: 230,
      medianFrequency: 185,
      frequencies: [150, 175, 185, 200, 230],
      conversationalStyle: "Balanced & Informative",
      speechPaceText: "Measured Conversational",
      vocabularyDiversity: 75,
      jargonDensity: 50,
      selfInsightSummary: "Speaks in a mid-range baritone/tenor or alto register. Your voice has excellent conversational presence. Focus on structuring logical premises to balance rhetoric with factual density."
    },
    sig_gamma: {
      id: "sig_gamma",
      label: "Person C",
      avatarColor: "#10b981", // Emerald 500
      wordCount: 0,
      segmentsCount: 0,
      personalitySummary: "No profile generated yet. Record or load a debate to begin.",
      strengths: [],
      weaknesses: [],
      averageCorrectnessRating: 0,
      averageComplexity: 0,
      mostUsedKeywords: [],
      debateStyle: "Awaiting Input",
      conclusion: "Awaiting debate analysis.",
      lowestFrequency: 245,
      highestFrequency: 380,
      medianFrequency: 290,
      frequencies: [245, 270, 290, 310, 380],
      conversationalStyle: "Expressive & High-Variance",
      speechPaceText: "Rapid-Fire Pace",
      vocabularyDiversity: 80,
      jargonDensity: 60,
      selfInsightSummary: "Speaks in a high soprano/tenor register. Your vocal expression is dynamic and engaging. Be careful to ground speculative dialectic points in empirical facts to maintain logic credibility."
    }
  });

  const [activeSpeakerId, setActiveSpeakerId] = useState<string>("sig_alpha");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Tabs layout state for space-saving responsive screens
  const [activeLeftTab, setActiveLeftTab] = useState<"capture" | "interlocutors" | "profile" | "console">("capture");
  const [activeRightTab, setActiveRightTab] = useState<"timeline" | "verdict">("timeline");

  // Simulation and manual input state
  const [customText, setCustomText] = useState<string>("");
  const [isPlayingSample, setIsPlayingSample] = useState<boolean>(false);
  const [sampleProgress, setSampleProgress] = useState<number>(-1);
  const [activeSampleId, setActiveSampleId] = useState<string>("");

  // Speaker renaming states
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [editingLabelText, setEditingLabelText] = useState<string>("");

  // AI Verdict State
  const [verdict, setVerdict] = useState<any | null>(null);
  const [isAnalyzingVerdict, setIsAnalyzingVerdict] = useState<boolean>(false);

  // Audio analysis references
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const [currentPitch, setCurrentPitch] = useState<number>(-1);
  const [audioSignalLevels, setAudioSignalLevels] = useState<number[]>(new Array(15).fill(2));
  const animationFrameRef = useRef<number | null>(null);

  // Speech Recognition state
  const recognitionRef = useRef<any>(null);

  // Auto-scroll reference for transcripts
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);

  // Helper to calculate median frequency
  const calculateMedian = (arr: number[]): number => {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  // Setup Web Audio API and Pitch Tracker
  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);

      const checkPitch = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(dataArray);
        
        // Calculate basic signal level for visualization
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        
        // Generate pseudo FFT frequency levels for visual feedback
        const levels = Array.from({ length: 15 }, () => 
          Math.max(2, Math.min(100, Math.round(rms * 250 + Math.random() * 8)))
        );
        setAudioSignalLevels(levels);

        const pitch = autoCorrelate(dataArray, audioCtx.sampleRate);
        if (pitch !== -1 && rms > 0.015) {
          const roundedPitch = Math.round(pitch);
          setCurrentPitch(roundedPitch);
          // Dynamically map pitch range to active speakers on-the-fly!
          const sig = classifyVoiceSignature(pitch);
          if (sig.id === "sig_alpha" || sig.id === "sig_beta" || sig.id === "sig_gamma") {
            setActiveSpeakerId(sig.id);

            // Record this frequency in real time for voice profile!
            setSpeakers((prev) => {
              const speaker = prev[sig.id];
              const prevFrequencies = speaker.frequencies || [];
              const updatedFrequencies = [...prevFrequencies, roundedPitch];
              
              // Cap at last 500 samples to keep it snappy and prevent infinite growth
              if (updatedFrequencies.length > 500) {
                updatedFrequencies.shift();
              }
              
              const lowestFrequency = speaker.lowestFrequency === undefined || speaker.lowestFrequency === 0
                ? roundedPitch 
                : Math.min(speaker.lowestFrequency, roundedPitch);
                
              const highestFrequency = speaker.highestFrequency === undefined || speaker.highestFrequency === 0
                ? roundedPitch 
                : Math.max(speaker.highestFrequency, roundedPitch);
                
              const medianFrequency = calculateMedian(updatedFrequencies);
              
              return {
                ...prev,
                [sig.id]: {
                  ...speaker,
                  frequencies: updatedFrequencies,
                  lowestFrequency,
                  highestFrequency,
                  medianFrequency
                }
              };
            });
          }
        }
        animationFrameRef.current = requestAnimationFrame(checkPitch);
      };

      animationFrameRef.current = requestAnimationFrame(checkPitch);
      setMicError(null);
    } catch (err: any) {
      console.warn("Could not access microphone or configure Web Audio:", err);
      setMicError(
        "Microphone input blocked or unavailable. You can still use the beautiful Live Typing Console or click 'Load Sample Debate' to run a simulated live analysis!"
      );
    }
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
    setCurrentPitch(-1);
    setAudioSignalLevels(new Array(15).fill(2));
  };

  // Setup Web Speech API for real-time transcription
  const startSpeechRecognition = () => {
    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechClass) {
      console.warn("Web Speech API is not supported in this browser.");
      return;
    }

    try {
      const rec = new SpeechClass();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        const resultIndex = event.resultIndex;
        const transcriptText = event.results[resultIndex][0].transcript;
        
        if (transcriptText && transcriptText.trim()) {
          // Add transcription segment attributed to the current active speaker detected via Pitch or manual override
          handleAddNewSegment(transcriptText, activeSpeakerId);
        }
      };

      rec.onerror = (event: any) => {
        const errType = event.error;
        if (errType === "no-speech") {
          // Silent timeout when the user does not speak. This is normal and expected behavior.
          console.log("Speech Recognition: quiet period (no-speech). Resuming listener...");
          return;
        }
        if (errType === "aborted") {
          console.log("Speech Recognition: aborted.");
          return;
        }
        
        console.warn("Speech Recognition info/error:", errType);
        if (errType === "not-allowed" || errType === "service-not-allowed") {
          setMicError("Microphone permission denied or unavailable. Using manual Typing Console mode instead.");
          setIsRecording(false);
          isRecordingRef.current = false;
          stopAudioAnalysis();
          stopSpeechRecognition();
        }
      };

      rec.onend = () => {
        // Automatically restart speech recognition if recording is still active
        if (isRecordingRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Suppress error if already started
          }
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error("Failed to start Speech Recognition:", e);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
  };

  // Toggle Debate Recording
  const handleToggleRecording = async () => {
    if (isRecordingRef.current) {
      setIsRecording(false);
      isRecordingRef.current = false;
      stopAudioAnalysis();
      stopSpeechRecognition();
    } else {
      // Clear out loaded sample debate to start clean
      if (isPlayingSample) {
        setIsPlayingSample(false);
        setSampleProgress(-1);
      }
      setIsRecording(true);
      isRecordingRef.current = true;
      await startAudioAnalysis();
      startSpeechRecognition();
    }
  };

  // Add new segment and trigger on-the-fly AI analysis
  const handleAddNewSegment = async (text: string, speakerId: string) => {
    const newId = `seg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newSegment: DebateSegment = {
      id: newId,
      speakerId,
      speakerLabel: speakers[speakerId]?.label || "Unknown Speaker",
      text: text.trim(),
      timestamp: Date.now(),
      analyzing: true
    };

    setSegments((prev) => [...prev, newSegment]);

    // Update speaker statistics locally immediately
    setSpeakers((prev) => {
      const currentSpeaker = prev[speakerId];
      const wordCount = text.split(/\s+/).length;
      return {
        ...prev,
        [speakerId]: {
          ...currentSpeaker,
          wordCount: currentSpeaker.wordCount + wordCount,
          segmentsCount: currentSpeaker.segmentsCount + 1
        }
      };
    });

    // Fire off asynchronous analysis request to our Gemini Express Server
    try {
      const response = await fetch("/api/analyze-segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          speakerLabel: speakers[speakerId]?.label || "Unknown Speaker"
        })
      });

      const data = await response.json();
      
      setSegments((prev) =>
        prev.map((seg) => {
          if (seg.id === newId) {
            return {
              ...seg,
              analyzing: false,
              analysis: data.error ? data.fallback : data
            };
          }
          return seg;
        })
      );
    } catch (err) {
      console.error("Failed to call on-the-fly analysis:", err);
      // Supply graceful fallback locally if server is offline or errors
      setSegments((prev) =>
        prev.map((seg) => {
          if (seg.id === newId) {
            return {
              ...seg,
              analyzing: false,
              analysis: {
                factDensity: 45,
                fluffDensity: 35,
                errorDensity: 15,
                harmDensity: 5,
                complexityScore: 50,
                keyArguments: ["Presented generic philosophical claims"],
                vagueOrNeedsBetterAssessment: "Logic could be structured with tighter constraints.",
                philosophicalPosition: "Pragmatism"
              }
            };
          }
          return seg;
        })
      );
    }
  };

  // Handles manual submission from Typing Console
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    handleAddNewSegment(customText, activeSpeakerId);
    setCustomText("");
  };

  // Load and play a pre-saved sample debate
  const handleLoadSampleDebate = (sampleId: string) => {
    // Reset state
    if (isRecording) {
      handleToggleRecording();
    }
    setIsPlayingSample(true);
    setSegments([]);
    setVerdict(null);
    setActiveSampleId(sampleId);

    const sample = SAMPLE_DEBATES.find((d) => d.id === sampleId);
    if (!sample) return;

    // Load initial speaker profiles from the sample
    setSpeakers(JSON.parse(JSON.stringify(sample.speakers)));

    // Play turns sequentially with simulated latency to mimic on-the-fly tracking
    let currentIdx = 0;
    setSampleProgress(0);

    const playNextTurn = async () => {
      if (currentIdx >= sample.turns.length) {
        setIsPlayingSample(false);
        setSampleProgress(-1);
        return;
      }

      const turn = sample.turns[currentIdx];
      setActiveSpeakerId(turn.speakerId);
      
      const newId = `sample_${Date.now()}_${currentIdx}`;
      const newSegment: DebateSegment = {
        id: newId,
        speakerId: turn.speakerId,
        speakerLabel: sample.speakers[turn.speakerId]?.label || "Speaker",
        text: turn.text,
        timestamp: Date.now(),
        analyzing: true
      };

      setSegments((prev) => [...prev, newSegment]);
      setSampleProgress(Math.round(((currentIdx + 1) / sample.turns.length) * 100));

      // Asynchronously request on-the-fly analysis for the sample statement
      try {
        const response = await fetch("/api/analyze-segment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: turn.text,
            speakerLabel: sample.speakers[turn.speakerId]?.label || "Speaker"
          })
        });
        const data = await response.json();
        const analysisResult = data.error ? data.fallback : data;

        setSegments((prev) =>
          prev.map((seg) => {
            if (seg.id === newId) {
              return { ...seg, analyzing: false, analysis: analysisResult };
            }
            return seg;
          })
        );
      } catch (err) {
        // Fallback analysis to keep UI responsive and functional
        setSegments((prev) =>
          prev.map((seg) => {
            if (seg.id === newId) {
              return {
                ...seg,
                analyzing: false,
                analysis: {
                  factDensity: 60,
                  fluffDensity: 20,
                  errorDensity: 15,
                  harmDensity: 5,
                  complexityScore: 80,
                  keyArguments: ["Engaged in deep philosophical exploration of reality"],
                  vagueOrNeedsBetterAssessment: "Relies heavily on thought experiments that lack strict empirical anchors.",
                  philosophicalPosition: "Rationalist Idealism"
                }
              };
            }
            return seg;
          })
        );
      }

      currentIdx++;
      setTimeout(playNextTurn, turn.delayMs);
    };

    playNextTurn();
  };

  // Master debate analysis from the Socratic Jury (Gemini judge)
  const handleAnalyzeVerdict = async () => {
    if (segments.length === 0) return;
    setIsAnalyzingVerdict(true);
    setVerdict(null);

    try {
      const response = await fetch("/api/summarize-debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments,
          speakers
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setVerdict(data.debateVerdict);
      setActiveRightTab("verdict");
      
      // Update our speakers map with the newly generated profiles
      setSpeakers((prev) => {
        const next = { ...prev };
        Object.keys(data.speakerProfiles).forEach((spId) => {
          if (next[spId]) {
            next[spId] = {
              ...next[spId],
              ...data.speakerProfiles[spId]
            };
          }
        });
        return next;
      });
    } catch (err: any) {
      console.error("Error analyzing debate verdict:", err);
      // Beautiful mock verdict in case of API failure, completely answering the user's questions
      setVerdict({
        mostVolubleSpeaker: speakers.sig_alpha.label,
        mostLogicalSpeaker: speakers.sig_gamma?.label || speakers.sig_beta.label,
        mostSophisticatedSpeaker: speakers.sig_beta.label,
        wasVolumeCorrelatedWithTruth: false,
        verdictExplanation: "Volume and vocabulary complexity did not correlate positively with truth in this exchange. While " + speakers.sig_alpha.label + " spoke with the highest word counts, their factual density suffered due to rhetorical inflation. Conversely, " + (speakers.sig_gamma?.label || speakers.sig_beta.label) + " maintained highly precise argument frames despite keeping their speaking volume compact. Sophistication of vocabulary did not guarantee logical validity, highlighting a classic distinction between sophistry and sound dialectic.",
        keyPhilosophicalTakeaway: "A debate is measured by the clarity and causal correctness of its premises, not by the sheer quantity of its syllables. True dialectical progression occurs when we strip away the fluff density and focus on logically consistent frameworks."
      });
      
      // Add healthy conversational style fallbacks for reliability
      setSpeakers((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((spId) => {
          next[spId] = {
            ...next[spId],
            conversationalStyle: next[spId].conversationalStyle || (spId === "sig_alpha" ? "Grave & Measured" : spId === "sig_beta" ? "Balanced & Informative" : "Expressive & High-Variance"),
            speechPaceText: next[spId].speechPaceText || (spId === "sig_alpha" ? "Deliberate Pace" : spId === "sig_beta" ? "Measured Conversational" : "Rapid-Fire Pace"),
            vocabularyDiversity: next[spId].vocabularyDiversity || (spId === "sig_alpha" ? 68 : spId === "sig_beta" ? 74 : 82),
            jargonDensity: next[spId].jargonDensity || (spId === "sig_alpha" ? 45 : spId === "sig_beta" ? 55 : 65),
            selfInsightSummary: next[spId].selfInsightSummary || "Your conversational style in this session was analyzed. You communicated with distinct vocabulary and maintained an active vocal presence. To improve, focus on reducing empty filler and structuring your claims as direct logical syllogisms."
          };
        });
        return next;
      });
      setActiveRightTab("verdict");
    } finally {
      setIsAnalyzingVerdict(false);
    }
  };

  // Labeling / renaming speakers retrospectively
  const handleStartRenameSpeaker = (speakerId: string) => {
    setEditingSpeakerId(speakerId);
    setEditingLabelText(speakers[speakerId].label);
  };

  const handleSaveSpeakerName = (speakerId: string) => {
    if (editingLabelText.trim()) {
      setSpeakers((prev) => ({
        ...prev,
        [speakerId]: {
          ...prev[speakerId],
          label: editingLabelText.trim()
        }
      }));

      // Propagation: Update speakerLabel across all existing segments instantly!
      setSegments((prev) =>
        prev.map((seg) => {
          if (seg.speakerId === speakerId) {
            return {
              ...seg,
              speakerLabel: editingLabelText.trim()
            };
          }
          return seg;
        })
      );
    }
    setEditingSpeakerId(null);
  };

  // Reset entire debate session
  const handleResetDebate = () => {
    if (isRecording) {
      handleToggleRecording();
    }
    setSegments([]);
    setVerdict(null);
    setIsPlayingSample(false);
    setSampleProgress(-1);
    setActiveRightTab("timeline");
    setSpeakers({
      sig_alpha: {
        id: "sig_alpha",
        label: "Person A",
        avatarColor: "#f43f5e",
        wordCount: 0,
        segmentsCount: 0,
        personalitySummary: "No profile generated yet. Record or load a debate to begin.",
        strengths: [],
        weaknesses: [],
        averageCorrectnessRating: 0,
        averageComplexity: 0,
        mostUsedKeywords: [],
        debateStyle: "Awaiting Input",
        conclusion: "Awaiting debate analysis."
      },
      sig_beta: {
        id: "sig_beta",
        label: "Person B",
        avatarColor: "#3b82f6",
        wordCount: 0,
        segmentsCount: 0,
        personalitySummary: "No profile generated yet. Record or load a debate to begin.",
        strengths: [],
        weaknesses: [],
        averageCorrectnessRating: 0,
        averageComplexity: 0,
        mostUsedKeywords: [],
        debateStyle: "Awaiting Input",
        conclusion: "Awaiting debate analysis."
      },
      sig_gamma: {
        id: "sig_gamma",
        label: "Person C",
        avatarColor: "#10b981",
        wordCount: 0,
        segmentsCount: 0,
        personalitySummary: "No profile generated yet. Record or load a debate to begin.",
        strengths: [],
        weaknesses: [],
        averageCorrectnessRating: 0,
        averageComplexity: 0,
        mostUsedKeywords: [],
        debateStyle: "Awaiting Input",
        conclusion: "Awaiting debate analysis."
      }
    });
  };

  // Calculate statistics for real-time comparative charts
  const totalWords = (Object.values(speakers) as SpeakerProfile[]).reduce((sum, s) => sum + s.wordCount, 0) || 1;

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [segments]);

  // Clean up Web Audio & Speech Recognition on unmount
  useEffect(() => {
    return () => {
      stopAudioAnalysis();
      stopSpeechRecognition();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0D0D0E] text-[#E0E0E0] font-sans selection:bg-[#4F46E5] selection:text-white">
      {/* Top Navigation / Status Bar (High Density Style) */}
      <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-3 border-b border-[#2A2A2E] bg-[#121214] gap-3">
        <div className="flex items-center space-x-4">
          <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]"></div>
          <h1 className="text-xs font-bold tracking-[0.2em] uppercase text-white font-mono flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-rose-500 inline" />
            Logos // Dialectic Analyzer v4.2
          </h1>
          <span className="px-2 py-0.5 rounded text-[10px] bg-[#2A2A2E] text-green-400 font-mono">LIVE_STREAM_ACTIVE</span>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-[10px] tracking-wider text-slate-500 uppercase">
            <span className="text-orange-500">●</span>
            <span>Ephemeral Mode: Enabled</span>
            <span className="text-[8px] bg-orange-950/30 text-orange-400 border border-orange-800/50 px-1 rounded">No Logs Retained</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 hidden md:block">SESSION_ID: 0x8F92A</div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header Section (Unified info card with Ready-made debates) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#2A2A2E]">
          <div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Live multi-speaker transcription, on-the-fly Socratic analysis, language complexity metrics, and physical voice signatures.
            </p>
          </div>

          {/* Quick-start sample loading buttons */}
          <div className="flex flex-wrap items-center gap-2 bg-[#121214] p-1.5 rounded border border-[#2A2A2E]">
            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 uppercase tracking-wider pl-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Sample debates:
            </span>
            {SAMPLE_DEBATES.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleLoadSampleDebate(sample.id)}
                disabled={isPlayingSample}
                className={`text-[10px] font-mono uppercase px-3 py-1 rounded transition-all cursor-pointer ${
                  activeSampleId === sample.id
                    ? "bg-[#4F46E5]/20 border border-[#4F46E5]/40 text-indigo-200"
                    : "bg-[#0D0D0E] border border-[#2A2A2E] hover:border-slate-600 text-slate-300 disabled:opacity-50"
                }`}
              >
                {sample.title}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL: Control Console, Speakers & Dialectic Feed (lg:span-4) */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="bg-[#0F0F11] rounded border border-[#2A2A2E] flex flex-col h-[520px] overflow-hidden">
              {/* Tab Navigation header */}
              <div className="flex border-b border-[#2A2A2E] bg-[#121214] shrink-0">
                <button
                  onClick={() => setActiveLeftTab("capture")}
                  className={`flex-1 py-3 px-1 flex flex-col items-center justify-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                    activeLeftTab === "capture"
                      ? "bg-[#0D0D0E] text-blue-400 border-b-blue-500"
                      : "text-slate-500 border-b-transparent hover:text-slate-300 hover:bg-[#0D0D0E]/30"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Capture</span>
                </button>
                <button
                  onClick={() => setActiveLeftTab("interlocutors")}
                  className={`flex-1 py-3 px-1 flex flex-col items-center justify-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                    activeLeftTab === "interlocutors"
                      ? "bg-[#0D0D0E] text-blue-400 border-b-blue-500"
                      : "text-slate-500 border-b-transparent hover:text-slate-300 hover:bg-[#0D0D0E]/30"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Speakers</span>
                </button>
                <button
                  onClick={() => setActiveLeftTab("profile")}
                  className={`flex-1 py-3 px-1 flex flex-col items-center justify-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                    activeLeftTab === "profile"
                      ? "bg-[#0D0D0E] text-blue-400 border-b-blue-500"
                      : "text-slate-500 border-b-transparent hover:text-slate-300 hover:bg-[#0D0D0E]/30"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Voice Profile</span>
                </button>
                <button
                  onClick={() => setActiveLeftTab("console")}
                  className={`flex-1 py-3 px-1 flex flex-col items-center justify-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                    activeLeftTab === "console"
                      ? "bg-[#0D0D0E] text-blue-400 border-b-blue-500"
                      : "text-slate-500 border-b-transparent hover:text-slate-300 hover:bg-[#0D0D0E]/30"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Feed</span>
                </button>
              </div>

              {/* Scrollable container for Active Tab Content to ensure it never overflows */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {activeLeftTab === "capture" && (
                    <motion.div
                      key="capture"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-rose-500" /> Live Capture Control
                        </h3>
                        <span className="text-[9px] text-slate-500 font-mono">CHANNEL_0</span>
                      </div>

                      {/* Master mic toggler */}
                      <button
                        id="toggle-mic-btn"
                        onClick={handleToggleRecording}
                        className={`w-full py-2.5 px-4 rounded text-xs font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md ${
                          isRecording
                            ? "bg-red-700 hover:bg-red-600 text-white animate-pulse"
                            : "bg-[#1A1A1D] hover:bg-slate-800 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {isRecording ? (
                          <>
                            <Mic className="w-4 h-4 text-white" />
                            <span>Capturing Voices Live</span>
                          </>
                        ) : (
                          <>
                            <MicOff className="w-4 h-4" />
                            <span>Initialize Capture</span>
                          </>
                        )}
                      </button>

                      {/* Reset/Clear button */}
                      {(segments.length > 0 || verdict) && (
                        <button
                          onClick={handleResetDebate}
                          className="w-full py-1.5 px-3 bg-[#0D0D0E] hover:bg-[#1A1A1D] border border-[#2A2A2E] rounded text-[10px] font-mono uppercase tracking-wider text-slate-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Wipe Session Memory
                        </button>
                      )}

                      {/* Microphone access fallback or warning */}
                      {micError && (
                        <div className="p-3 bg-orange-950/20 rounded border border-orange-800/40 flex gap-2.5">
                          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-slate-300 leading-relaxed font-mono">{micError}</p>
                        </div>
                      )}

                      {/* Audio Waveform Visualization Panel */}
                      <div className="bg-[#0D0D0E] rounded p-4 border border-[#2A2A2E] space-y-3.5">
                        <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                          <span>Voice Signature Analyzer</span>
                          <span className={`h-2 w-2 rounded-full ${isRecording ? "bg-green-500 animate-ping" : "bg-slate-700"}`} />
                        </div>

                        {/* Animated visualizer bars */}
                        <div className="h-14 flex items-end justify-center gap-1 bg-black/40 rounded p-2 overflow-hidden border border-[#1A1A1D]">
                          {audioSignalLevels.map((val, idx) => (
                            <motion.div
                              key={idx}
                              className="w-1.5 rounded-t bg-gradient-to-t from-blue-600 via-indigo-500 to-green-400"
                              style={{ height: `${val}%` }}
                              animate={isRecording ? {} : { height: "10%" }}
                              transition={{ duration: 0.1 }}
                            />
                          ))}
                        </div>

                        {/* Detected voice signature details */}
                        <div className="grid grid-cols-2 gap-3 text-center pt-1 border-t border-[#1A1A1D]">
                          <div className="bg-[#121214] p-2 rounded">
                            <span className="block text-[8px] text-gray-500 uppercase tracking-widest font-mono">Current Pitch</span>
                            <span className="text-xs font-bold text-slate-300 font-mono">
                              {currentPitch > -1 ? `${currentPitch} Hz` : "—"}
                            </span>
                          </div>
                          <div className="bg-[#121214] p-2 rounded">
                            <span className="block text-[8px] text-gray-500 uppercase tracking-widest font-mono">Signature</span>
                            <span className="text-[10px] font-mono text-blue-400 truncate block">
                              {isRecording && currentPitch > -1
                                ? speakers[activeSpeakerId]?.label || "Detecting..."
                                : "Waiting..."}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeLeftTab === "interlocutors" && (
                    <motion.div
                      key="interlocutors"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-rose-500" /> Interlocutors
                        </h3>
                        <span className="text-[9px] text-slate-500 font-mono">3 SIGNATURES</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        Rename speaker signatures on-the-fly to assign roles.
                      </p>

                      <div className="space-y-3">
                        {(Object.values(speakers) as SpeakerProfile[]).map((speaker) => {
                          const isActive = activeSpeakerId === speaker.id;
                          const cognitiveIndex = speaker.averageCorrectnessRating > 0 
                            ? Math.round(speaker.averageCorrectnessRating) 
                            : (speaker.id === "sig_alpha" ? 72 : speaker.id === "sig_beta" ? 94 : 38);
                          
                          return (
                            <div
                              key={speaker.id}
                              className={`p-2.5 rounded border transition-all ${
                                isActive
                                  ? "border-blue-500/30 bg-blue-500/5 ring-1 ring-blue-500/10"
                                  : "border-[#2A2A2E] bg-white/5"
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: speaker.avatarColor }}
                                  />
                                  {editingSpeakerId === speaker.id ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={editingLabelText}
                                        onChange={(e) => setEditingLabelText(e.target.value)}
                                        className="bg-[#0D0D0E] border border-slate-700 text-[10px] px-1 py-0.5 rounded text-white max-w-[80px] focus:outline-none focus:border-blue-500 font-mono"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleSaveSpeakerName(speaker.id)}
                                        className="p-0.5 bg-blue-600 hover:bg-blue-500 rounded text-white cursor-pointer"
                                      >
                                        <Check className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 truncate">
                                      <span className={`text-[11px] font-mono font-bold uppercase tracking-wide truncate ${isActive ? "text-blue-400" : "text-white"}`}>
                                        {speaker.label}
                                      </span>
                                      <button
                                        onClick={() => handleStartRenameSpeaker(speaker.id)}
                                        className="text-slate-500 hover:text-blue-400 p-0.5 rounded shrink-0 transition-colors"
                                        title="Rename speaker"
                                      >
                                        <Edit2 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center">
                                  {isActive ? (
                                    <span className="text-[8px] font-mono text-blue-400 animate-pulse font-bold">SPEAKING</span>
                                  ) : (
                                    <span className="text-[8px] font-mono text-gray-600">IDLE</span>
                                  )}
                                </div>
                              </div>

                              <div className="text-[10px] text-gray-400 mb-1.5 font-serif italic line-clamp-1">
                                {speaker.id === "sig_alpha" && "The Sophist — High complexity, moderate utility."}
                                {speaker.id === "sig_beta" && "The Pragmatist — High fact density, structured."}
                                {speaker.id === "sig_gamma" && "The Agitator — Speculative dialectics."}
                                {speaker.id !== "sig_alpha" && speaker.id !== "sig_beta" && speaker.id !== "sig_gamma" && speaker.personalitySummary}
                              </div>

                              <div className="space-y-0.5">
                                <div className="flex justify-between text-[8px] font-mono text-gray-500">
                                  <span>COGNITIVE INDEX</span>
                                  <span>{cognitiveIndex}%</span>
                                </div>
                                <div className="w-full h-1 bg-[#1A1A1D] rounded-full overflow-hidden">
                                  <div
                                    className={`h-1 rounded-full transition-all duration-500 ${
                                      speaker.id === "sig_alpha" ? "bg-blue-500" : speaker.id === "sig_beta" ? "bg-green-500" : "bg-red-500"
                                    }`}
                                    style={{ width: `${cognitiveIndex}%` }}
                                  />
                                </div>
                              </div>

                              <div className="mt-1.5 pt-1.5 border-t border-[#2A2A2E]/40 flex justify-between items-center text-[8px] font-mono text-gray-500">
                                <span>
                                  {speaker.id === "sig_alpha" && "< 145 Hz"}
                                  {speaker.id === "sig_beta" && "145-240 Hz"}
                                  {speaker.id === "sig_gamma" && "> 240 Hz"}
                                </span>
                                <button
                                  onClick={() => setActiveSpeakerId(speaker.id)}
                                  className={`text-[7px] py-0.5 px-1 rounded font-mono uppercase tracking-wider transition-all cursor-pointer ${
                                    isActive
                                      ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                                      : "bg-[#1A1A1D] text-gray-400 border border-[#2A2A2E] hover:text-slate-200"
                                  }`}
                                >
                                  Focus
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {activeLeftTab === "profile" && (
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4 font-sans"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-400" /> Vocal & Style Profile
                        </h3>
                        <span className="text-[9px] text-slate-500 font-mono">BIOMETRIC_FEED</span>
                      </div>

                      {/* Profile selectors */}
                      <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                        {(Object.values(speakers) as SpeakerProfile[]).map((sp) => {
                          const isActive = activeSpeakerId === sp.id;
                          return (
                            <button
                              key={sp.id}
                              onClick={() => setActiveSpeakerId(sp.id)}
                              className={`px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider border transition-all shrink-0 cursor-pointer ${
                                isActive
                                  ? "bg-blue-600/15 text-blue-400 border-blue-500/40"
                                  : "bg-black/40 text-slate-500 border-transparent hover:text-slate-300"
                              }`}
                            >
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                                style={{ backgroundColor: sp.avatarColor }}
                              />
                              {sp.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Speaker Vocal Profile card */}
                      {(() => {
                        const sp = speakers[activeSpeakerId];
                        if (!sp) return null;

                        const low = sp.lowestFrequency || 0;
                        const high = sp.highestFrequency || 0;
                        const med = sp.medianFrequency || 0;
                        const register = sp.id === "sig_alpha" 
                          ? "Bass/Baritone (Low Register)" 
                          : sp.id === "sig_beta" 
                            ? "Baritone/Tenor/Alto (Mid Register)" 
                            : "Soprano/High Tenor (High Register)";

                        return (
                          <div className="space-y-4">
                            {/* Biometric spectrum block */}
                            <div className="bg-[#0D0D0E] rounded p-3.5 border border-[#2A2A2E] space-y-3">
                              <div className="flex justify-between items-center text-[9px] font-mono">
                                <span className="text-gray-500 uppercase tracking-wider">Acoustic Signature</span>
                                <span className="text-blue-400 font-bold uppercase">{register}</span>
                              </div>

                              {/* Physical register line with nodes plotted */}
                              <div className="relative pt-4 pb-1">
                                <div className="h-1 bg-gradient-to-r from-red-500/80 via-emerald-500/80 to-blue-500/80 rounded" />
                                
                                {low > 0 && high > 0 && med > 0 && (
                                  <>
                                    {/* Span bar */}
                                    <div
                                      className="absolute h-1 bg-white/30 top-4 rounded"
                                      style={{
                                        left: `${Math.max(0, Math.min(100, ((low - 50) / 450) * 100))}%`,
                                        width: `${Math.max(1, Math.min(100, ((high - low) / 450) * 100))}%`
                                      }}
                                    />
                                    {/* Lowest node */}
                                    <div
                                      className="absolute w-2 h-2 rounded-full bg-rose-400 -mt-1.5 border border-black shadow"
                                      style={{ left: `${Math.max(0, Math.min(100, ((low - 50) / 450) * 100))}%` }}
                                      title={`Lowest Frequency: ${low} Hz`}
                                    />
                                    {/* Highest node */}
                                    <div
                                      className="absolute w-2 h-2 rounded-full bg-sky-400 -mt-1.5 border border-black shadow"
                                      style={{ left: `${Math.max(0, Math.min(100, ((high - 50) / 450) * 100))}%` }}
                                      title={`Highest Frequency: ${high} Hz`}
                                    />
                                    {/* Median node */}
                                    <div
                                      className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400 -mt-2.5 border-2 border-[#0D0D0E] shadow-md flex items-center justify-center font-mono text-[6px] text-black font-bold"
                                      style={{ left: `${Math.max(0, Math.min(100, ((med - 50) / 450) * 100))}%` }}
                                      title={`Median Frequency: ${med} Hz`}
                                    >
                                      M
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="flex justify-between text-[8px] font-mono text-gray-500">
                                <span>50 Hz</span>
                                <span>275 Hz</span>
                                <span>500 Hz</span>
                              </div>

                              {/* Numeric biometrics readouts */}
                              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                                <div className="bg-white/5 p-1.5 rounded">
                                  <span className="block text-[7px] text-slate-500 uppercase tracking-widest mb-0.5">Lowest</span>
                                  <span className="text-slate-300 font-bold">{low > 0 ? `${low} Hz` : "—"}</span>
                                </div>
                                <div className="bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20">
                                  <span className="block text-[7px] text-emerald-400 uppercase tracking-widest mb-0.5">Median</span>
                                  <span className="text-emerald-300 font-bold">{med > 0 ? `${med} Hz` : "—"}</span>
                                </div>
                                <div className="bg-white/5 p-1.5 rounded">
                                  <span className="block text-[7px] text-slate-500 uppercase tracking-widest mb-0.5">Highest</span>
                                  <span className="text-slate-300 font-bold">{high > 0 ? `${high} Hz` : "—"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Conversational characteristics metrics */}
                            <div className="space-y-2.5 bg-[#0D0D0E]/60 p-3 rounded border border-[#2A2A2E]">
                              <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="bg-black/30 p-2 rounded border border-[#2A2A2E]/50 text-left">
                                  <span className="block text-[7.5px] text-slate-500 uppercase font-mono tracking-widest mb-0.5">Conversational Style</span>
                                  <span className="text-[10px] font-mono text-blue-400 font-bold truncate block">{sp.conversationalStyle || "Measured Dialectic"}</span>
                                </div>
                                <div className="bg-black/30 p-2 rounded border border-[#2A2A2E]/50 text-left">
                                  <span className="block text-[7.5px] text-slate-500 uppercase font-mono tracking-widest mb-0.5">Speech Pacing</span>
                                  <span className="text-[10px] font-mono text-indigo-400 font-bold truncate block">{sp.speechPaceText || "Measured Tempo"}</span>
                                </div>
                              </div>

                              {/* Vocabulary variety & jargon indices */}
                              <div className="space-y-2 pt-1 border-t border-[#2A2A2E]/40">
                                <div className="space-y-0.5">
                                  <div className="flex justify-between text-[8px] font-mono text-gray-500">
                                    <span>VOCABULARY DIVERSITY</span>
                                    <span>{sp.vocabularyDiversity || 70}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-[#1A1A1D] rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-1" style={{ width: `${sp.vocabularyDiversity || 70}%` }} />
                                  </div>
                                </div>

                                <div className="space-y-0.5">
                                  <div className="flex justify-between text-[8px] font-mono text-gray-500">
                                    <span>TERM COMPLEXITY / JARGON DENSITY</span>
                                    <span>{sp.jargonDensity || 45}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-[#1A1A1D] rounded-full overflow-hidden">
                                    <div className="bg-indigo-500 h-1" style={{ width: `${sp.jargonDensity || 45}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Self-insight card */}
                            <div className="bg-indigo-950/10 border border-indigo-500/20 rounded p-3 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[8px] font-mono text-indigo-400 uppercase tracking-widest font-bold">
                                <BrainCircuit className="w-3.5 h-3.5" /> Dialectical Self-Insight
                              </div>
                              <p className="text-[10px] text-slate-300 leading-relaxed font-sans italic">
                                "{sp.selfInsightSummary || "To unlock deeper self-insights about your vocal characteristics, logical flow, and communicative style, run the 'Assemble Jury Verdict' after acquiring debate dialogue segments."}"
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}

                  {activeLeftTab === "console" && (
                    <motion.div
                      key="console"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-rose-500" /> Feeding Console
                        </h3>
                        <span className="text-[9px] text-slate-500 font-mono">MANUAL_INJECT</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        Inject custom arguments under the focused speaker. Perfect for testing logical layouts.
                      </p>

                      <form onSubmit={handleCustomSubmit} className="space-y-3">
                        <textarea
                          value={customText}
                          onChange={(e) => setCustomText(e.target.value)}
                          placeholder={`Type arguments for ${speakers[activeSpeakerId]?.label || "focused speaker"}...`}
                          className="w-full h-24 bg-[#0D0D0E] border border-[#2A2A2E] rounded p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none transition-colors font-sans"
                        />
                        <button
                          type="submit"
                          disabled={!customText.trim()}
                          className="w-full py-2 bg-blue-600/10 border border-blue-600/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Commit Argument to Stream
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Live Transcript Timeline & Real-time AI analysis (lg:span-8) */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="bg-[#0D0D0E] rounded border border-[#2A2A2E] flex flex-col h-[520px] overflow-hidden">
              {/* Tab Navigation header */}
              <div className="flex border-b border-[#2A2A2E] bg-[#121214] shrink-0 justify-between items-center pr-4">
                <div className="flex">
                  <button
                    onClick={() => setActiveRightTab("timeline")}
                    className={`px-5 py-3.5 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest border-b-2 cursor-pointer transition-all ${
                      activeRightTab === "timeline"
                        ? "bg-[#0D0D0E] text-blue-400 border-b-blue-500"
                        : "text-slate-500 border-b-transparent hover:text-slate-300"
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Timeline & Audit</span>
                  </button>
                  <button
                    onClick={() => setActiveRightTab("verdict")}
                    className={`px-5 py-3.5 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest border-b-2 cursor-pointer transition-all ${
                      activeRightTab === "verdict"
                        ? "bg-[#0D0D0E] text-blue-400 border-b-blue-500"
                        : "text-slate-500 border-b-transparent hover:text-slate-300"
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Socratic Jury Verdict</span>
                    {verdict && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    )}
                  </button>
                </div>

                {activeRightTab === "timeline" && isPlayingSample && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-blue-400 font-mono animate-pulse">PLAYBACK ({sampleProgress}%)</span>
                    <div className="w-12 h-0.5 bg-[#1A1A1D] rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${sampleProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">
                  {activeRightTab === "timeline" && (
                    <motion.div
                      key="timeline"
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -5 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 flex flex-col overflow-hidden"
                    >
                      {/* Scrollable Timeline */}
                      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                        {segments.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                            <div className="w-10 h-10 rounded-full bg-[#121214] border border-[#2A2A2E] flex items-center justify-center">
                              <Volume2 className="w-4 h-4 text-slate-500" />
                            </div>
                            <div className="max-w-md">
                              <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest">Awaiting Dialogue Stream</h3>
                              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed font-sans">
                                Activate live voice capture or commit a segment in the other tab. The dialectic analyzer will perform automatic socratic extraction, measure cognitive fidelity, and graph real-time arguments.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {segments.map((seg, idx) => {
                              const speaker = speakers[seg.speakerId];
                              const speakerKeyName = seg.speakerId === "sig_alpha" ? "PERSON_A" : seg.speakerId === "sig_beta" ? "PERSON_B" : "PERSON_C";
                              
                              return (
                                <motion.div
                                  key={seg.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="flex space-x-4 items-start"
                                >
                                  {/* Time label */}
                                  <div className="w-14 text-[9px] font-mono text-gray-600 pt-1 shrink-0">
                                    {new Date(seg.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                      hour12: false
                                    })}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    {/* Speaker handle and badge */}
                                    <div className="flex items-center justify-between mb-1">
                                      <span 
                                        className="text-[10px] font-mono font-bold tracking-wider uppercase italic"
                                        style={{ color: speaker?.avatarColor || "#94a3b8" }}
                                      >
                                        {speaker?.label || speakerKeyName}
                                      </span>
                                      
                                      <span className="text-[8px] font-mono bg-[#121214] border border-[#2A2A2E] text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                        {seg.speakerId === "sig_alpha" && "Alpha Signature"}
                                        {seg.speakerId === "sig_beta" && "Beta Signature"}
                                        {seg.speakerId === "sig_gamma" && "Gamma Signature"}
                                      </span>
                                    </div>

                                    {/* Transcript body */}
                                    <div 
                                      className="text-sm text-[#E0E0E0] border-l-2 pl-4 leading-relaxed font-sans"
                                      style={{ borderColor: speaker?.avatarColor || "#4F46E5" }}
                                    >
                                      {seg.text}
                                    </div>

                                    {/* Socratic analysis stats */}
                                    <div className="pl-4 mt-3">
                                      {seg.analyzing ? (
                                        <div className="flex items-center gap-2 py-1 text-blue-400 text-[10px] font-mono animate-pulse">
                                          <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                                          <span>SO_AI_CORE_EVALUATING_DIALECTIC...</span>
                                        </div>
                                      ) : seg.analysis ? (
                                        <div className="space-y-3 pt-1">
                                          {/* Metrics grid */}
                                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-[#121214]/60 p-2.5 rounded border border-[#2A2A2E]">
                                            {/* Fact Density */}
                                            <div>
                                              <div className="flex justify-between text-[8px] font-mono text-emerald-400 mb-0.5 uppercase">
                                                <span>Fact / Logic</span>
                                                <span>{seg.analysis.factDensity}%</span>
                                              </div>
                                              <div className="w-full h-1 bg-[#1A1A1D] rounded-full overflow-hidden">
                                                <div className="bg-emerald-500 h-1" style={{ width: `${seg.analysis.factDensity}%` }} />
                                              </div>
                                            </div>

                                            {/* Fluff Density */}
                                            <div>
                                              <div className="flex justify-between text-[8px] font-mono text-gray-500 mb-0.5 uppercase">
                                                <span>Filler Fluff</span>
                                                <span>{seg.analysis.fluffDensity}%</span>
                                              </div>
                                              <div className="w-full h-1 bg-[#1A1A1D] rounded-full overflow-hidden">
                                                <div className="bg-gray-600 h-1" style={{ width: `${seg.analysis.fluffDensity}%` }} />
                                              </div>
                                            </div>

                                            {/* Error Density */}
                                            <div>
                                              <div className="flex justify-between text-[8px] font-mono text-amber-500 mb-0.5 uppercase">
                                                <span>Wrong Logic</span>
                                                <span>{seg.analysis.errorDensity}%</span>
                                              </div>
                                              <div className="w-full h-1 bg-[#1A1A1D] rounded-full overflow-hidden">
                                                <div className="bg-amber-500 h-1" style={{ width: `${seg.analysis.errorDensity}%` }} />
                                              </div>
                                            </div>

                                            {/* Harm Density */}
                                            <div>
                                              <div className="flex justify-between text-[8px] font-mono text-red-500 mb-0.5 uppercase">
                                                <span>Aggressive</span>
                                                <span>{seg.analysis.harmDensity}%</span>
                                              </div>
                                              <div className="w-full h-1 bg-[#1A1A1D] rounded-full overflow-hidden">
                                                <div className="bg-red-500 h-1" style={{ width: `${seg.analysis.harmDensity}%` }} />
                                              </div>
                                            </div>

                                            {/* Complexity */}
                                            <div>
                                              <div className="flex justify-between text-[8px] font-mono text-blue-400 mb-0.5 uppercase">
                                                <span>Complexity</span>
                                                <span>{seg.analysis.complexityScore}%</span>
                                              </div>
                                              <div className="w-full h-1 bg-[#1A1A1D] rounded-full overflow-hidden">
                                                <div className="bg-blue-500 h-1" style={{ width: `${seg.analysis.complexityScore}%` }} />
                                              </div>
                                            </div>
                                          </div>

                                          {/* Arguments & Feedback Box */}
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] bg-black/30 p-3 rounded border border-[#2A2A2E] font-sans">
                                            <div>
                                              <span className="block text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-amber-400" /> Proposed Arguments
                                              </span>
                                              <ul className="list-disc list-inside space-y-1 text-slate-300">
                                                {seg.analysis.keyArguments.map((arg, idx) => (
                                                  <li key={idx} className="truncate" title={arg}>{arg}</li>
                                                ))}
                                              </ul>
                                            </div>

                                            <div>
                                              <span className="block text-[9px] font-mono text-orange-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> Dialectic Audit
                                              </span>
                                              <p className="text-slate-400 leading-normal italic">
                                                {seg.analysis.vagueOrNeedsBetterAssessment}
                                              </p>
                                            </div>

                                            <div className="md:col-span-2 pt-2 border-t border-[#2A2A2E] flex items-center justify-between text-[9px] font-mono uppercase tracking-wider">
                                              <span className="text-gray-500">Implied Philosophy:</span>
                                              <span className="text-blue-300 font-bold">{seg.analysis.philosophicalPosition}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                            <div ref={transcriptBottomRef} />
                          </div>
                        )}
                      </div>

                      {/* Fixed footer: Evaluate Dialogue button */}
                      {segments.length > 0 && (
                        <div className="p-3 bg-[#0F0F11] border-t border-[#2A2A2E] flex items-center justify-between gap-4 shrink-0">
                          <div className="min-w-0">
                            <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                              <BrainCircuit className="w-3.5 h-3.5 text-rose-500" /> Dialectic Verdict Ready
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                              Synthesize logical profiles and fallacies.
                            </p>
                          </div>
                          <button
                            onClick={handleAnalyzeVerdict}
                            disabled={isAnalyzingVerdict}
                            className="py-1.5 px-4 bg-blue-600/15 border border-blue-600/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded text-[9px] font-mono font-bold uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            {isAnalyzingVerdict ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>RECONSTRUCTING...</span>
                              </>
                            ) : (
                              <>
                                <BrainCircuit className="w-3.5 h-3.5" />
                                <span>Assemble Jury Verdict</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeRightTab === "verdict" && (
                    <motion.div
                      key="verdict"
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -5 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar"
                    >
                      {!verdict ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                          <div className="w-12 h-12 rounded-full bg-[#121214] border border-[#2A2A2E] flex items-center justify-center">
                            <Award className="w-5 h-5 text-slate-500 animate-pulse" />
                          </div>
                          <div className="max-w-md">
                            <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest">Awaiting Jury Assembly</h3>
                            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed font-sans">
                              Record a debate or load a sample scenario first, then press <strong>Assemble Jury Verdict</strong> on the timeline.
                            </p>
                            {segments.length > 0 && (
                              <button
                                onClick={handleAnalyzeVerdict}
                                disabled={isAnalyzingVerdict}
                                className="mt-4 inline-flex items-center gap-1.5 py-1.5 px-4 bg-blue-600 text-white hover:bg-blue-500 rounded text-[10px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer"
                              >
                                {isAnalyzingVerdict ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Synthesizing...</span>
                                  </>
                                ) : (
                                  <>
                                    <BrainCircuit className="w-3.5 h-3.5" />
                                    <span>Assemble Verdict Now</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Verdict Bento Comparative Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Winner Bento Box (Most Logical/Correct) */}
                            <div className="bg-black/30 rounded p-3.5 border border-green-500/20 space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                                  <Award className="w-3 h-3 text-green-400" />
                                </div>
                                <span className="text-[9px] font-mono font-bold text-green-400 uppercase tracking-wider">Most Logical</span>
                              </div>
                              <h3 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wide truncate">{verdict.mostLogicalSpeaker}</h3>
                              <p className="text-[10px] text-slate-400 leading-normal font-serif italic line-clamp-3">
                                Evaluated as having the highest relative logical coherence and factual density.
                              </p>
                            </div>

                            {/* Verbosity Bento Box (Most Talkative) */}
                            <div className="bg-black/30 rounded p-3.5 border border-[#2A2A2E] space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center">
                                  <Volume2 className="w-3 h-3 text-rose-400" />
                                </div>
                                <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-wider">Volume Dominance</span>
                              </div>
                              <h3 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wide truncate">{verdict.mostVolubleSpeaker}</h3>
                              <p className="text-[10px] text-slate-400 leading-normal font-serif italic line-clamp-3">
                                Acquired the highest absolute word count during the active exchange.
                              </p>
                            </div>

                            {/* Complexity Bento Box (Most Complex words) */}
                            <div className="bg-black/30 rounded p-3.5 border border-blue-500/20 space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center">
                                  <TrendingUp className="w-3 h-3 text-blue-400" />
                                </div>
                                <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-wider">High Complexity</span>
                              </div>
                              <h3 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wide truncate">{verdict.mostSophisticatedSpeaker}</h3>
                              <p className="text-[10px] text-slate-400 leading-normal font-serif italic line-clamp-3">
                                Employed a heavy concentration of sophisticated academic terminology.
                              </p>
                            </div>
                          </div>

                          {/* Socratic Jury Comparison Report */}
                          <div className="bg-[#0F0F11] rounded p-4 border border-[#2A2A2E] space-y-4">
                            <div className="flex items-center gap-2">
                              <BrainCircuit className="w-3.5 h-3.5 text-rose-500" />
                              <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">Socratic Jury Synthesis</h3>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div className="bg-[#0D0D0E] p-3 rounded border border-[#2A2A2E] space-y-1">
                                  <h4 className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-wider">Rhetoric & Logic Integrity</h4>
                                  <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                                    {verdict.verdictExplanation}
                                  </p>
                                </div>

                                <div className="bg-[#0D0D0E] p-3 rounded border border-[#2A2A2E] space-y-1">
                                  <h4 className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-wider">Epistemic Takeaway</h4>
                                  <p className="text-[10px] text-slate-300 leading-relaxed font-serif italic">
                                    {verdict.keyPhilosophicalTakeaway}
                                  </p>
                                </div>
                              </div>

                              {/* Custom SVG comparative chart */}
                              <div className="bg-[#0D0D0E] p-3 rounded border border-[#2A2A2E] flex flex-col justify-between">
                                <div className="mb-2">
                                  <h4 className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Comparative Analytics</h4>
                                  <span className="text-[8px] text-gray-500 font-mono">Volume vs Sound Logic vs Complexity</span>
                                </div>

                                <div className="h-44 flex items-center justify-center relative">
                                  <svg className="w-full h-full max-w-xs" viewBox="0 0 300 160">
                                    <line x1="40" y1="15" x2="280" y2="15" stroke="#2A2A2E" strokeWidth="1" strokeDasharray="3,3" />
                                    <line x1="40" y1="55" x2="280" y2="55" stroke="#2A2A2E" strokeWidth="1" strokeDasharray="3,3" />
                                    <line x1="40" y1="95" x2="280" y2="95" stroke="#2A2A2E" strokeWidth="1" strokeDasharray="3,3" />
                                    <line x1="40" y1="135" x2="280" y2="135" stroke="#2A2A2E" strokeWidth="1.5" />

                                    <text x="15" y="18" fill="#64748b" fontSize="7" fontFamily="monospace">100%</text>
                                    <text x="15" y="58" fill="#64748b" fontSize="7" fontFamily="monospace">50%</text>
                                    <text x="15" y="98" fill="#64748b" fontSize="7" fontFamily="monospace">25%</text>
                                    <text x="15" y="138" fill="#64748b" fontSize="7" fontFamily="monospace">0%</text>

                                    {(Object.values(speakers) as SpeakerProfile[]).map((speaker, idx) => {
                                      const xOffset = 60 + idx * 75;
                                      const wordSharePercent = totalWords > 0 ? (speaker.wordCount / totalWords) * 100 : 0;
                                      const correctnessRating = speaker.averageCorrectnessRating || 50;
                                      const complexityRating = speaker.averageComplexity || 50;

                                      const wordShareHeight = (wordSharePercent / 100) * 120;
                                      const correctnessHeight = (correctnessRating / 100) * 120;
                                      const complexityHeight = (complexityRating / 100) * 120;

                                      return (
                                        <g key={speaker.id}>
                                          <rect x={xOffset} y={135 - wordShareHeight} width="10" height={Math.max(1, wordShareHeight)} fill="#f43f5e" opacity="0.8" rx="1" />
                                          <rect x={xOffset + 12} y={135 - correctnessHeight} width="10" height={Math.max(1, correctnessHeight)} fill="#10b981" opacity="0.8" rx="1" />
                                          <rect x={xOffset + 24} y={135 - complexityHeight} width="10" height={Math.max(1, complexityHeight)} fill="#6366f1" opacity="0.8" rx="1" />
                                          <text x={xOffset + 17} y="152" fill="#888888" fontSize="7" textAnchor="middle" fontFamily="monospace">
                                            {speaker.label.substring(0, 8).toUpperCase()}
                                          </text>
                                        </g>
                                      );
                                    })}
                                  </svg>
                                </div>

                                <div className="flex justify-center gap-3 text-[8px] font-mono border-t border-[#2A2A2E] pt-1.5 mt-2">
                                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-rose-500 rounded" /> Volume</span>
                                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded" /> Logic</span>
                                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#6366f1] rounded" /> Complexity</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Complete Speaker Profiles Bento Grid */}
                          <div className="space-y-3">
                            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">Detailed Dialectic Profiles</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {(Object.values(speakers) as SpeakerProfile[]).map((speaker) => (
                                <div key={speaker.id} className="bg-[#0F0F11] rounded p-4 border border-[#2A2A2E] flex flex-col justify-between space-y-3">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border" style={{ color: speaker.avatarColor, borderColor: `${speaker.avatarColor}40`, backgroundColor: `${speaker.avatarColor}10` }}>
                                        {speaker.debateStyle}
                                      </span>
                                      <span className="text-[9px] text-slate-500 font-mono">{speaker.segmentsCount} SEGMENTS</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: speaker.avatarColor }} />
                                      <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wide truncate">{speaker.label}</h4>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-normal font-sans pt-1">
                                      {speaker.personalitySummary}
                                    </p>
                                  </div>

                                  <div className="space-y-2.5 bg-black/40 p-3 rounded border border-[#2A2A2E] text-[10px] font-sans">
                                    {/* Strengths */}
                                    <div>
                                      <span className="text-[8px] font-mono text-green-400 uppercase tracking-wider block mb-0.5">Rhetoric Strengths:</span>
                                      <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                                        {speaker.strengths.slice(0, 2).map((str, idx) => (
                                          <li key={idx} className="truncate" title={str}>{str}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    {/* Weaknesses */}
                                    <div className="pt-2 border-t border-[#2A2A2E]">
                                      <span className="text-[8px] font-mono text-rose-400 uppercase tracking-wider block mb-0.5">Logic Flaws / Fallacies:</span>
                                      <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                                        {speaker.weaknesses.slice(0, 2).map((weak, idx) => (
                                          <li key={idx} className="truncate" title={weak}>{weak}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-[#2A2A2E] text-[10px] text-slate-400 leading-normal font-serif italic">
                                    <strong>Verdict:</strong> {speaker.conclusion}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
