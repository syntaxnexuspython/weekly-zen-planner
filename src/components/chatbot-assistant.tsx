import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Send, Loader2, Bot, User as UserIcon, RefreshCw, ClipboardList, HelpCircle, Mic, MicOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { ChatMessage } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";

// Suggestion Prompts to help user get started quickly
const SUGGESTIONS = [
  { label: "Show today's tasks", text: "List my tasks for today" },
  { label: "Add gym today", text: "Add a task: Workout today from 6:00 PM to 7:00 PM" },
  { label: "Show weekly stats", text: "How are my stats looking this week?" },
  { label: "Check my streak", text: "What is my current streak status?" },
];

// Define interfaces for Web Speech API to prevent TS errors
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function ChatbotAssistant() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }
    setIsListening(false);
  };

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Stop listening when the assistant sheet is closed
  useEffect(() => {
    if (!isOpen && isListening) {
      stopListening();
    }
  }, [isOpen, isListening]);

  const startListening = () => {
    if (!SpeechRecognitionAPI) {
      toast.error("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    try {
      // If there is an active session, stop it first just in case
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Microphone permission denied. Please allow microphone access in your browser settings.");
        } else if (event.error === "aborted") {
          // This can be triggered intentionally when stopping
        } else {
          toast.error(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const transcript = finalTranscript || interimTranscript;
        if (transcript.trim()) {
          setInput(transcript);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      toast.error("Could not start speech recognition.");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Load message history from sessionStorage on mount or session change
  useEffect(() => {
    if (!session) return;
    const key = `zen_chat_history_${session.user.email}`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored chat history", e);
      }
    } else {
      // Default welcome message
      const welcome: ChatMessage = {
        role: "assistant",
        content: `Hi ${session.user.first_name || "there"}! 🧘‍♂️ I'm your Zen AI assistant.\n\nI can help you manage your weekly planner using natural language. Try asking me:\n- *"List my tasks for today"* \n- *"Add a task: Yoga session tomorrow at 7 AM"* \n- *"Mark my team sync task as completed"* \n- *"Delete my meeting task"*`,
      };
      setMessages([welcome]);
      sessionStorage.setItem(key, JSON.stringify([welcome]));
    }
  }, [session]);

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  if (!session) return null;

  // Persist messages to sessionStorage
  const saveMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    const key = `zen_chat_history_${session.user.email}`;
    sessionStorage.setItem(key, JSON.stringify(newMessages));
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: textToSend,
    };

    const updatedMessages = [...messages, userMessage];
    saveMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Send chat history along to FastAPI (filter out the initial helper greeting if needed,
      // but sending everything is standard)
      const chatHistoryForApi = updatedMessages.slice(0, -1);
      
      const response = await api.chatWithBot(textToSend, chatHistoryForApi);
      
      const botMessage: ChatMessage = {
        role: "assistant",
        content: response.reply,
      };

      saveMessages([...updatedMessages, botMessage]);

      // Detect if the user asked to modify tasks/streaks (or just trigger query invalidations
      // after every reply to be safe and ensure the frontend UI always stays synced)
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["streakHistory"] });
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });

    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message || "Something went wrong on the server."}`,
      };
      saveMessages([...updatedMessages, errorMessage]);
      toast.error("AI Assistant request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    const welcome: ChatMessage = {
      role: "assistant",
      content: `Hi ${session.user.first_name || "there"}! Let's start fresh. How can I help you with your planner today?`,
    };
    saveMessages([welcome]);
  };

  // Helper function to render formatted message markdown content
  const formatMessage = (text: string) => {
    if (!text) return null;

    // Split by code blocks
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```")) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : "";
        const code = match ? match[2] : part.slice(3, -3);
        return (
          <pre
            key={index}
            className="my-2 overflow-x-auto rounded-lg bg-slate-900 border border-border/50 p-3 text-xs font-mono text-slate-100"
          >
            {language && (
              <div className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold tracking-wider">
                {language}
              </div>
            )}
            <code>{code.trim()}</code>
          </pre>
        );
      }

      // Process line-by-line
      const lines = part.split("\n");
      return (
        <div key={index} className="space-y-1">
          {lines.map((line, lineIndex) => {
            let cleanLine = line.trim();
            const isBullet = cleanLine.startsWith("- ") || cleanLine.startsWith("* ");
            if (isBullet) {
              cleanLine = cleanLine.substring(2);
            }

            // Bold styling
            const boldParts = cleanLine.split(/(\*\*.*?\*\*)/g);
            const formattedLine = boldParts.map((boldPart, bpIndex) => {
              if (boldPart.startsWith("**") && boldPart.endsWith("**")) {
                return (
                  <strong key={bpIndex} className="font-semibold text-foreground">
                    {boldPart.slice(2, -2)}
                  </strong>
                );
              }
              
              // Inline code styling
              const codeParts = boldPart.split(/(`.*?`)/g);
              return codeParts.map((codePart, cpIndex) => {
                if (codePart.startsWith("`") && codePart.endsWith("`")) {
                  return (
                    <code
                      key={cpIndex}
                      className="rounded bg-secondary/80 border border-border/30 px-1 py-0.5 text-xs font-mono font-semibold"
                    >
                      {codePart.slice(1, -1)}
                    </code>
                  );
                }
                return codePart;
              });
            });

            if (isBullet) {
              return (
                <ul key={lineIndex} className="list-disc pl-5 my-0.5 space-y-0.5 text-muted-foreground">
                  <li className="text-sm">{formattedLine}</li>
                </ul>
              );
            }

            return cleanLine ? (
              <p key={lineIndex} className="text-sm leading-relaxed text-muted-foreground">
                {formattedLine}
              </p>
            ) : (
              <div key={lineIndex} className="h-1.5" />
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg cursor-pointer bg-gradient-to-tr from-primary via-purple-600 to-indigo-600 hover:opacity-95 text-white border-0 transition-transform duration-300 hover:scale-105 active:scale-95"
          >
            <Sparkles className="h-6 w-6 animate-pulse" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[100vw] sm:w-[440px] border-l border-border/40 bg-background/95 backdrop-blur-md p-0 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="border-b border-border/40 p-4 flex items-center justify-between bg-card/50">
            <SheetHeader className="space-y-0 text-left">
              <SheetTitle className="flex items-center gap-2 text-lg font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
                <Sparkles className="h-5 w-5 text-primary" />
                Zen AI Assistant
              </SheetTitle>
              <SheetDescription className="text-xs">
                Manage your tasks & schedule with AI
              </SheetDescription>
            </SheetHeader>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground mr-6"
              onClick={clearChat}
              title="Reset conversation"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                      msg.role === "user"
                        ? "bg-primary border-primary/20 text-white"
                        : "bg-muted border-border/30 text-muted-foreground"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <UserIcon className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4 text-indigo-500" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        msg.role === "user"
                          ? "bg-primary text-white rounded-tr-none"
                          : "bg-card border border-border/40 text-foreground rounded-tl-none"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {formatMessage(msg.content)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 max-w-[85%] mr-auto items-start">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted border border-border/30 text-muted-foreground animate-pulse">
                    <Bot className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="bg-card border border-border/40 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    <span>AI is working...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Suggestions (Shown when no pending actions and simple history) */}
          {!isLoading && messages.length <= 2 && (
            <div className="px-4 py-2 bg-muted/20 border-t border-border/20">
              <div className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-2 uppercase flex items-center gap-1">
                <HelpCircle className="h-3 w-3" /> Suggested requests
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s.text)}
                    className="text-[11px] font-medium border border-border/50 bg-background/50 hover:bg-muted transition-colors rounded-full px-2.5 py-1 text-muted-foreground hover:text-foreground cursor-pointer text-left"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Panel */}
          <div className="p-4 border-t border-border/40 bg-card/30">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex gap-2 items-center"
            >
              <Input
                placeholder={isListening ? "Listening..." : "Type a message or task update..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 rounded-full border-border/60 bg-background/60 shadow-inner focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
              <Button
                type="button"
                onClick={toggleListening}
                disabled={isLoading}
                size="icon"
                variant="ghost"
                className={`rounded-full shrink-0 cursor-pointer h-10 w-10 transition-all ${
                  isListening
                    ? "bg-red-500 hover:bg-red-600 text-white animate-pulse ring-4 ring-red-500/20"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/40"
                }`}
                title={isListening ? "Stop listening" : "Speak to type"}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 animate-bounce" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !input.trim() || isListening}
                size="icon"
                className="rounded-full shrink-0 cursor-pointer h-10 w-10 bg-primary hover:bg-primary/90 text-white transition-all shadow-md"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
