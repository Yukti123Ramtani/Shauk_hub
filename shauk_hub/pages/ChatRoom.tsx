
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Message, User, Group, Member, ReportReason, Report, Attachment } from '../types';
import { getMessages, addMessage, getGroupDetails, getGroupMembers, submitReport } from '../services/storageService';
import { moderateContent, generateBotReply } from '../services/geminiService';
import { fetchKlipyMedia, KlipyMedia } from '../services/klipyService';
import { Send, ArrowLeft, Paperclip, Smile, Mic, MicOff, Video, VideoOff, PhoneOff, MoreVertical, Search, Phone, CheckCheck, ShieldAlert, Sparkles, X, LogOut, BellOff, Flag, Info, Image, File, Link as LinkIcon, Sticker, Settings, RefreshCw, ChevronDown, Monitor, Download, Loader2 } from 'lucide-react';
import { BANNED_REGEX, WELCOME_MESSAGES, EMOJIS } from '../constants';

interface ChatRoomProps {
  user: User;
}

// Simple pattern for background
const BG_PATTERN = `data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E`;

type VideoQuality = 'low' | 'medium' | 'high';

const VIDEO_CONSTRAINTS = {
  low: { width: 480, height: 360 },
  medium: { width: 640, height: 480 },
  high: { width: 1280, height: 720 },
};

const ChatRoom: React.FC<ChatRoomProps> = ({ user }) => {
  const { hobbyId, groupId } = useParams<{ hobbyId: string; groupId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModerating, setIsModerating] = useState(false);
  
  // Group Info State
  const [groupDetails, setGroupDetails] = useState<Group | undefined>(undefined);
  const [members, setMembers] = useState<Member[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Attachment & Sticker State
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<'emojis' | 'stickers' | 'gifs'>('emojis');
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [mediaItems, setMediaItems] = useState<KlipyMedia[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaOffset, setMediaOffset] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaScrollRef = useRef<HTMLDivElement>(null);

  // Reporting State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [messageToReport, setMessageToReport] = useState<Message | null>(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);

  // Video Call State
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [showCallSettings, setShowCallSettings] = useState(false);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>('high');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  
  const currentHobby = decodeURIComponent(hobbyId || '');
  const currentGroupId = decodeURIComponent(groupId || '');

  // Helper to generate consistent colors for usernames
  const getAvatarColor = (name: string) => {
    const colors = [
      'text-red-500', 'text-green-500', 'text-blue-500', 
      'text-orange-500', 'text-purple-500', 'text-pink-500', 'text-cyan-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Load group details & members
  useEffect(() => {
    if (currentGroupId) {
        setGroupDetails(getGroupDetails(currentGroupId));
        setMembers(getGroupMembers(currentGroupId));
    }
  }, [currentGroupId]);

  // Click outside listener for menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close main menu
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      // Close message specific menus if clicking elsewhere
      if (activeMessageMenu && !(event.target as HTMLElement).closest('.message-menu-btn')) {
        setActiveMessageMenu(null);
      }
      // Close attachment menu
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
          setShowAttachMenu(false);
      }
      // Close emoji picker if clicking outside input area (simplified)
      if (showEmojiPicker && !(event.target as HTMLElement).closest('.emoji-trigger') && !(event.target as HTMLElement).closest('.emoji-picker-container')) {
          setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMessageMenu, showEmojiPicker]);

  // Poll for messages and "Real-time" listener
  useEffect(() => {
    if (!currentGroupId) return;

    const loadMessages = () => setMessages(getMessages(currentGroupId));
    loadMessages();

    const handleStorageUpdate = (e: CustomEvent) => {
      // Check if event is for this specific room/group
      if (e.detail?.roomId === currentGroupId) {
         setMessages(prev => {
            if (prev.some(m => m.id === e.detail.message.id)) return prev;
            return [...prev, e.detail.message];
         });
      }
    };

    window.addEventListener('hobbyhub_new_message', handleStorageUpdate as EventListener);

    const currentMsgs = getMessages(currentGroupId);
    if (currentMsgs.length === 0) {
      const welcomeMsg: Message = {
        id: 'system-welcome',
        userId: 'system',
        username: 'System',
        text: WELCOME_MESSAGES[currentHobby] || WELCOME_MESSAGES['default'],
        timestamp: Date.now(),
        isSystem: true
      };
      addMessage(currentGroupId, welcomeMsg);
    }

    return () => {
      window.removeEventListener('hobbyhub_new_message', handleStorageUpdate as EventListener);
    };
  }, [currentGroupId, currentHobby]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, showEmojiPicker]);

  // Video Call Effect
  useEffect(() => {
    if (isInCall && localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
    }
  }, [isInCall, localStream]);

  // --- Klipy Media Fetching ---
  const loadMedia = useCallback(async (reset = false) => {
    if (activeMediaTab === 'emojis') return;

    setIsLoadingMedia(true);
    const offset = reset ? 0 : mediaOffset;
    const type = activeMediaTab === 'gifs' ? 'gifs' : 'stickers';

    try {
      const results = await fetchKlipyMedia(type, mediaSearchQuery, offset);
      setMediaItems(prev => reset ? results : [...prev, ...results]);
      setMediaOffset(prev => reset ? 20 : prev + 20);
    } catch (err) {
      console.error("Error fetching media", err);
    } finally {
      setIsLoadingMedia(false);
    }
  }, [activeMediaTab, mediaSearchQuery, mediaOffset]);

  // Reset and load when tab or search changes
  useEffect(() => {
    if (showEmojiPicker && activeMediaTab !== 'emojis') {
      setMediaOffset(0);
      loadMedia(true);
    }
  }, [activeMediaTab, mediaSearchQuery, showEmojiPicker]);

  const handleMediaScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && !isLoadingMedia) {
      loadMedia(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, attachment?: Attachment, textOverride?: string) => {
    if (e) e.preventDefault();
    const textToSend = textOverride !== undefined ? textOverride : newMessage;

    if ((!textToSend.trim() && !attachment) || !currentGroupId) return;

    setError(null);
    setIsModerating(true);

    if (textToSend && BANNED_REGEX.test(textToSend)) {
      setError("This topic is not allowed.");
      setIsModerating(false);
      return;
    }

    if (textToSend) {
        const moderationResult = await moderateContent(textToSend);
        if (!moderationResult.safe) {
            setError("Message blocked by AI.");
            setIsModerating(false);
            return;
        }
    }

    const msg: Message = {
      id: Date.now().toString(),
      userId: user.id,
      username: user.username,
      text: textToSend,
      timestamp: Date.now(),
      attachment
    };

    addMessage(currentGroupId, msg);
    if (textOverride === undefined) setNewMessage(''); // Only clear input if valid text message sent
    setIsModerating(false);
    setShowEmojiPicker(false);

    if (textToSend) {
        triggerBotResponse(currentGroupId);
    }
  };

  const triggerBotResponse = async (roomId: string) => {
    if (Math.random() > 0.3) {
      setIsTyping(true);
      setTimeout(async () => {
        const history = getMessages(roomId);
        const reply = await generateBotReply(currentHobby, history);
        
        if (reply) {
          const botMsg: Message = {
            id: Date.now().toString(),
            userId: 'bot-gemini',
            username: 'HobbyBot',
            text: reply,
            timestamp: Date.now()
          };
          addMessage(roomId, botMsg);
        }
        setIsTyping(false);
      }, 2000 + Math.random() * 2000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
          setError("File size too large (max 5MB)");
          return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
          const result = ev.target?.result as string;
          const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
          
          const attachment: Attachment = {
              id: Date.now().toString(),
              type,
              url: result,
              name: file.name,
              size: file.size
          };
          
          handleSendMessage(undefined, attachment, '');
          setShowAttachMenu(false);
      };
      reader.readAsDataURL(file);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
          setError("File size too large (max 5MB)");
          return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
          const result = ev.target?.result as string;
          
          const attachment: Attachment = {
              id: Date.now().toString(),
              type: 'file', // Explicitly file type for docs
              url: result,
              name: file.name,
              size: file.size
          };
          
          handleSendMessage(undefined, attachment, '');
          setShowAttachMenu(false);
      };
      reader.readAsDataURL(file);
      
      // Reset input
      if (docInputRef.current) docInputRef.current.value = '';
  };

  const sendSticker = (url: string) => {
      const stickerAttachment: Attachment = {
          id: Date.now().toString(),
          type: 'image',
          url,
          isSticker: true
      };
      handleSendMessage(undefined, stickerAttachment, '');
  };

  const sendGif = (url: string) => {
    // Treat GIF same as sticker/image but usually not strictly "sticker" type if we want bubble.
    // For now, let's treat as image but transparent if desired, or just standard image.
    const gifAttachment: Attachment = {
        id: Date.now().toString(),
        type: 'image',
        url,
        isSticker: false // Show in bubble
    };
    handleSendMessage(undefined, gifAttachment, '');
  };

  const handleEmojiClick = (emoji: string) => {
      setNewMessage(prev => prev + emoji);
  };

  const openReportModal = (msg: Message | null) => {
      if (!msg) return; // Prevent opening without a message
      setMessageToReport(msg);
      setReportReason('');
      setShowReportModal(true);
      setActiveMessageMenu(null);
      setShowMenu(false);
  };

  const handleSubmitReport = () => {
      if (!currentGroupId || !reportReason) return;

      const report: Report = {
          id: `rpt-${Date.now()}`,
          reporterId: user.id,
          reporterName: user.username,
          reportedUserId: messageToReport ? messageToReport.userId : undefined,
          reportedUserName: messageToReport ? messageToReport.username : undefined,
          messageId: messageToReport ? messageToReport.id : undefined,
          messageContent: messageToReport ? messageToReport.text : undefined,
          groupId: currentGroupId,
          reason: reportReason,
          timestamp: Date.now(),
          status: 'pending'
      };

      submitReport(report);
      
      setShowReportModal(false);
      setMessageToReport(null);
      alert('Report submitted to HobbyHub Team. We have logged the incident and notified the admins.');
  };

  // --- Video Call Functions ---
  
  const getMediaStream = async (deviceId?: string, quality: VideoQuality = 'high') => {
      const constraints = {
          audio: true,
          video: {
              deviceId: deviceId ? { exact: deviceId } : undefined,
              ...VIDEO_CONSTRAINTS[quality]
          }
      };
      return await navigator.mediaDevices.getUserMedia(constraints);
  };

  const handleStartCall = async () => {
      try {
          const stream = await getMediaStream(undefined, videoQuality);
          setLocalStream(stream);
          setIsInCall(true);
          setShowMenu(false);
          
          // Enumerate devices
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setCameras(videoDevices);
          
          // Set initial camera ID
          const currentTrack = stream.getVideoTracks()[0];
          const currentSettings = currentTrack.getSettings();
          if (currentSettings.deviceId) {
              setSelectedCameraId(currentSettings.deviceId);
          } else if (videoDevices.length > 0) {
              setSelectedCameraId(videoDevices[0].deviceId);
          }

      } catch (err) {
          console.error("Error accessing media devices", err);
          alert("Could not access camera or microphone. Please check permissions.");
      }
  };

  const updateStream = async (newDeviceId: string, newQuality: VideoQuality) => {
      if (!localStream) return;
      
      // Stop current tracks
      localStream.getTracks().forEach(track => track.stop());

      try {
          const newStream = await getMediaStream(newDeviceId, newQuality);
          
          // Maintain mute/video off state
          newStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
          newStream.getVideoTracks().forEach(track => track.enabled = !isCameraOff);

          setLocalStream(newStream);
          setSelectedCameraId(newDeviceId);
          setVideoQuality(newQuality);
          
          if (localVideoRef.current) {
              localVideoRef.current.srcObject = newStream;
          }
      } catch (err) {
          console.error("Error updating stream", err);
          alert("Failed to switch camera settings.");
      }
  };

  const handleEndCall = () => {
      if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
      }
      setLocalStream(null);
      setIsInCall(false);
      setIsMuted(false);
      setIsCameraOff(false);
      setShowCallSettings(false);
  };

  const toggleMute = () => {
      if (localStream) {
          localStream.getAudioTracks().forEach(track => track.enabled = isMuted);
          setIsMuted(!isMuted);
      }
  };

  const toggleCamera = () => {
      if (localStream) {
          localStream.getVideoTracks().forEach(track => track.enabled = isCameraOff);
          setIsCameraOff(!isCameraOff);
      }
  };

  const switchCamera = () => {
      // Logic for quick toggle button (mobile style)
      if (cameras.length < 2) return;
      
      const currentIndex = cameras.findIndex(c => c.deviceId === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCameraId = cameras[nextIndex].deviceId;
      
      updateStream(nextCameraId, videoQuality);
  };

  // Helper function to render text with clickable links
  const renderMessageText = (text: string) => {
    // Regex to match URLs (http/https)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        // Check if it's an internal application link
        const isInternalLink = part.includes('/#/chat/');
        
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              if (isInternalLink) {
                 // Extract path after hash to navigate
                 const path = part.split('#')[1];
                 if (path) navigate(path);
              } else {
                 window.open(part, '_blank');
              }
            }}
            className="text-blue-500 hover:underline cursor-pointer break-all font-medium"
            title={isInternalLink ? "Join Group" : "Open Link"}
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-100 dark:bg-[#0f0f0f] relative font-sans">
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div 
          className="flex-none h-14 bg-white dark:bg-[#212121] flex items-center justify-between px-4 shadow-sm z-20 cursor-pointer border-l border-slate-200 dark:border-black/20"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/hobby/${encodeURIComponent(currentHobby)}`);
              }} 
              className="text-slate-500 dark:text-slate-300"
            >
              <ArrowLeft size={22} />
            </button>
            
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-blue-400 to-blue-600`}>
                  {getInitials(groupDetails?.name || currentHobby)}
              </div>
              <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white leading-tight">
                    {groupDetails?.name || currentHobby}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isTyping ? <span className="text-blue-500">typing...</span> : `${members.length} members, ${members.filter(m => m.isOnline).length} online`}
                  </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-slate-400 dark:text-slate-500 relative">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    handleStartCall();
                }}
                className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors hidden sm:block"
                title="Start Video Call"
            >
                <Video size={22} />
            </button>
            <Phone size={20} className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors hidden sm:block" />
            
            <div ref={menuRef}>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                    <MoreVertical size={20} className="hover:text-slate-600 dark:hover:text-slate-300" />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                    <div className="absolute right-0 top-10 w-48 bg-white dark:bg-[#2b2b2b] rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
                         <button 
                            onClick={handleStartCall}
                            className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 sm:hidden"
                        >
                            <Video size={16} /> Video Call
                        </button>
                        <button className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                            <BellOff size={16} /> Mute Notifications
                        </button>
                        <button className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                            <Search size={16} /> Search
                        </button>
                        <button className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                            <LogOut size={16} /> Leave Group
                        </button>
                    </div>
                )}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 relative overflow-hidden bg-[#8caba1] dark:bg-[#0f0f0f]">
          <div className="absolute inset-0 opacity-40 dark:opacity-10 pointer-events-none" style={{ backgroundImage: `url("${BG_PATTERN}")` }}></div>
          
          <div className="relative h-full overflow-y-auto px-2 py-4 sm:px-4 md:px-[15%] flex flex-col gap-2 scrollbar-hide">
            {messages.map((msg, index) => {
              const isMe = msg.userId === user.id;
              const isSystem = msg.isSystem;
              const isBot = msg.userId === 'bot-gemini';
              const showTail = !messages[index + 1] || messages[index + 1].userId !== msg.userId;
              const isMenuOpen = activeMessageMenu === msg.id;
              const isSticker = msg.attachment?.isSticker;

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2 sticky top-2 z-10">
                    <span className="text-xs font-semibold text-white bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} group mb-1 relative`}>
                  
                  {/* Message Menu (More Dots) */}
                  {!isMe && !isSystem && (
                      <div className="absolute -right-8 top-1 z-20">
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveMessageMenu(isMenuOpen ? null : msg.id);
                            }}
                            className={`message-menu-btn p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-opacity bg-white/50 dark:bg-black/30 rounded-full ${isMenuOpen ? 'opacity-100 ring-2 ring-red-400' : 'opacity-0 group-hover:opacity-100'}`}
                            title="Message Options"
                          >
                            <MoreVertical size={14} />
                          </button>
                          
                          {isMenuOpen && (
                              <div className="absolute right-8 top-0 w-32 bg-white dark:bg-[#2b2b2b] rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-150">
                                  <button 
                                      onClick={() => openReportModal(msg)}
                                      className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                  >
                                      <Flag size={12} /> Report
                                  </button>
                              </div>
                          )}
                      </div>
                  )}

                  <div 
                    className={`
                      relative max-w-[85%] sm:max-w-[70%] text-[15px] transition-all duration-200
                      ${isSticker 
                          ? 'bg-transparent' // No bubble for stickers
                          : isMe 
                            ? 'bg-[#eeffde] dark:bg-[#2b5278] text-black dark:text-white rounded-[14px] rounded-tr-none shadow-sm px-3 py-1.5' 
                            : 'bg-white dark:bg-[#182533] text-black dark:text-white rounded-[14px] rounded-tl-none shadow-sm px-3 py-1.5'
                      }
                      ${isMenuOpen ? 'ring-2 ring-offset-1 ring-red-500 z-30' : ''}
                    `}
                  >
                    {!isSticker && showTail && isMe && (
                      <svg className="absolute -right-[8px] bottom-0 w-[9px] h-[20px] fill-[#eeffde] dark:fill-[#2b5278]" viewBox="0 0 9 20">
                        <path d="M0 20C2.5 17 6 12 6 0v20H0z" />
                      </svg>
                    )}
                    {!isSticker && showTail && !isMe && (
                      <svg className="absolute -left-[8px] bottom-0 w-[9px] h-[20px] fill-white dark:fill-[#182533] transform scale-x-[-1]" viewBox="0 0 9 20">
                        <path d="M0 20C2.5 17 6 12 6 0v20H0z" />
                      </svg>
                    )}

                    {!isMe && !isSticker && (
                      <p className={`text-xs font-semibold mb-0.5 cursor-pointer hover:underline ${isBot ? 'text-blue-500' : getAvatarColor(msg.username)}`}>
                        {msg.username}
                        {isBot && <span className="ml-1 text-[10px] bg-blue-500 text-white px-1 rounded">BOT</span>}
                      </p>
                    )}

                    {/* Media Rendering */}
                    {msg.attachment?.type === 'image' && (
                        <div className={`mb-1 overflow-hidden ${isSticker ? '' : 'rounded-lg my-1'}`}>
                            <img 
                                src={msg.attachment.url} 
                                alt="Attachment" 
                                className={`${isSticker ? 'w-32 h-32 object-contain drop-shadow-md' : 'max-w-full max-h-64 object-cover'}`} 
                            />
                        </div>
                    )}
                    {msg.attachment?.type === 'video' && (
                        <div className="rounded-lg overflow-hidden my-1 max-w-full">
                            <video src={msg.attachment.url} controls className="max-w-full max-h-64" />
                        </div>
                    )}
                    
                    {/* General File Rendering */}
                    {msg.attachment?.type === 'file' && (
                        <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg my-1 border border-slate-200 dark:border-slate-700 w-full min-w-[200px]">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full flex-shrink-0">
                                <File size={20} />
                            </div>
                            <div className="flex-1 min-w-0 mr-2">
                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title={msg.attachment.name}>
                                    {msg.attachment.name || 'Document'}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {formatFileSize(msg.attachment.size)}
                                </div>
                            </div>
                            <a 
                                href={msg.attachment.url} 
                                download={msg.attachment.name}
                                className="p-2 text-slate-500 hover:text-blue-500 transition-colors"
                                title="Download"
                            >
                                <Download size={20} />
                            </a>
                        </div>
                    )}

                    {msg.text && (
                        <span className="whitespace-pre-wrap leading-relaxed block pr-8 pb-1">
                        {renderMessageText(msg.text)}
                        </span>
                    )}

                    <div className={`float-right ml-2 flex items-center gap-1 ${isSticker ? 'bg-black/30 rounded-full px-2 py-0.5 mt-1' : 'translate-y-1'}`}>
                      <span className={`text-[11px] ${isSticker ? 'text-white' : isMe ? 'text-[#59d469] dark:text-blue-300' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                      {isMe && (
                        <CheckCheck size={14} className={`${isSticker ? 'text-white' : 'text-[#59d469] dark:text-blue-400'}`} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-none bg-white dark:bg-[#212121] p-2 sm:p-3 relative z-30">
          
          {/* Sticker & Emoji Drawer */}
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 w-full sm:w-96 bg-white dark:bg-[#212121] border-t border-r border-slate-200 dark:border-slate-700 shadow-xl rounded-tr-xl emoji-picker-container animate-in slide-in-from-bottom-5 duration-200 flex flex-col h-80">
                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#2b2b2b]">
                    <button 
                        onClick={() => setActiveMediaTab('emojis')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeMediaTab === 'emojis' ? 'text-blue-500 border-b-2 border-blue-500 bg-white dark:bg-[#212121]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Emojis
                    </button>
                    <button 
                        onClick={() => setActiveMediaTab('stickers')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeMediaTab === 'stickers' ? 'text-blue-500 border-b-2 border-blue-500 bg-white dark:bg-[#212121]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Stickers
                    </button>
                    <button 
                        onClick={() => setActiveMediaTab('gifs')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeMediaTab === 'gifs' ? 'text-blue-500 border-b-2 border-blue-500 bg-white dark:bg-[#212121]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        GIFs
                    </button>
                </div>
                
                {/* Search Bar for Media */}
                {activeMediaTab !== 'emojis' && (
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#212121]">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder={`Search ${activeMediaTab}...`}
                                className="w-full bg-slate-100 dark:bg-slate-800 rounded-full pl-8 pr-4 py-1.5 text-sm outline-none text-slate-700 dark:text-slate-200"
                                value={mediaSearchQuery}
                                onChange={(e) => setMediaSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                )}
                
                {/* Content */}
                <div 
                    className="flex-1 overflow-y-auto p-4 bg-white dark:bg-[#212121]" 
                    ref={mediaScrollRef}
                    onScroll={handleMediaScroll}
                >
                    {/* Emojis Content */}
                    {activeMediaTab === 'emojis' && (
                        <div className="space-y-4">
                            {Object.entries(EMOJIS).map(([category, emojis]) => (
                                <div key={category}>
                                    <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase">{category}</h4>
                                    <div className="grid grid-cols-8 gap-2">
                                        {emojis.map((emoji, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => handleEmojiClick(emoji)}
                                                className="text-2xl hover:bg-slate-100 dark:hover:bg-slate-700 rounded p-1 transition-colors"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stickers & GIFs Content (Powered by Klipy Service) */}
                    {(activeMediaTab === 'stickers' || activeMediaTab === 'gifs') && (
                        <div className={`grid gap-4 ${activeMediaTab === 'stickers' ? 'grid-cols-4' : 'grid-cols-2'}`}>
                            {mediaItems.map((item) => (
                                <button 
                                    key={item.id} 
                                    onClick={() => activeMediaTab === 'stickers' ? sendSticker(item.url) : sendGif(item.url)}
                                    className={`
                                        hover:scale-105 transition-transform p-1 rounded-lg overflow-hidden
                                        ${activeMediaTab === 'gifs' ? 'border border-slate-200 dark:border-slate-700' : ''}
                                    `}
                                >
                                    <img 
                                        src={item.url} 
                                        alt={item.title} 
                                        className="w-full h-auto object-contain" 
                                        loading="lazy"
                                    />
                                </button>
                            ))}
                            {/* Loading Indicator */}
                            {isLoadingMedia && (
                                <div className="col-span-full flex justify-center py-4">
                                    <Loader2 size={24} className="animate-spin text-blue-500" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
          )}

          {error && (
              <div className="absolute bottom-full left-0 right-0 bg-red-100 dark:bg-red-900/80 text-red-600 dark:text-red-200 px-4 py-2 text-sm flex items-center justify-center gap-2 backdrop-blur-md">
                  <ShieldAlert size={16} /> {error}
              </div>
          )}
          
          <div className="max-w-4xl mx-auto flex items-end gap-2">
              <div className="relative" ref={attachMenuRef}>
                  <button 
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className={`p-3 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 ${showAttachMenu ? 'text-blue-500 rotate-45' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <Paperclip size={24} />
                  </button>
                  
                  {/* Attachment Dropdown */}
                  {showAttachMenu && (
                      <div className="absolute bottom-14 left-0 w-56 bg-white dark:bg-[#2b2b2b] rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col p-2 animate-in fade-in zoom-in-95 duration-200">
                           <input 
                                type="file" 
                                accept="image/*,video/*" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect}
                                className="hidden" 
                            />
                            <input 
                                type="file" 
                                accept="*" 
                                ref={docInputRef} 
                                onChange={handleDocSelect}
                                className="hidden" 
                            />
                           <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition-colors text-left"
                           >
                               <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full">
                                   <Image size={18} />
                               </div>
                               <div>
                                   <div className="text-sm font-semibold">Gallery</div>
                                   <div className="text-xs text-slate-500">Photo or Video</div>
                               </div>
                           </button>
                           <button 
                                onClick={() => docInputRef.current?.click()}
                                className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition-colors text-left"
                            >
                               <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full">
                                   <File size={18} />
                               </div>
                               <div>
                                   <div className="text-sm font-semibold">File</div>
                                   <div className="text-xs text-slate-500">Share document</div>
                               </div>
                           </button>
                      </div>
                  )}
              </div>
              
              <form onSubmit={(e) => handleSendMessage(e)} className="flex-1 bg-white dark:bg-[#212121] flex items-center gap-2">
                  <div className="flex-1 relative">
                      <input
                          ref={inputRef}
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Write a message..."
                          disabled={isModerating}
                          onFocus={() => setShowEmojiPicker(false)}
                          className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 px-2 py-3 outline-none text-[16px]"
                      />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 transition-colors emoji-trigger ${showEmojiPicker ? 'text-blue-500' : 'text-slate-400 hover:text-yellow-500'}`}
                  >
                      {showEmojiPicker ? <Sticker size={24} /> : <Smile size={24} />}
                  </button>
              </form>

              {newMessage.trim() ? (
                  <button 
                      onClick={() => handleSendMessage()}
                      disabled={isModerating}
                      className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-transform active:scale-95 flex items-center justify-center"
                  >
                      {isModerating ? <Sparkles size={24} className="animate-spin" /> : <Send size={24} className="ml-1" />}
                  </button>
              ) : (
                  <button className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                      <Mic size={24} />
                  </button>
              )}
          </div>
        </div>
      </div>

      {/* Sidebar (Members List) */}
      <div 
        className={`
          absolute right-0 top-0 h-full w-full sm:w-80 bg-white dark:bg-[#212121] border-l border-slate-200 dark:border-black/20 shadow-2xl transition-transform duration-300 z-30
          ${showSidebar ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-lg text-slate-800 dark:text-white">Group Info</h3>
            <button onClick={() => setShowSidebar(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X size={24} className="text-slate-500" />
            </button>
        </div>
        
        <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
            <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-4xl text-white font-bold mb-3 shadow-lg">
                    {getInitials(groupDetails?.name || currentHobby)}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center">
                    {groupDetails?.name || currentHobby}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {members.length} members
                </p>
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                    <Info size={12} />
                    <span>{groupDetails?.description || 'No description available.'}</span>
                </div>
            </div>

            <h4 className="text-blue-500 text-sm font-semibold mb-3 uppercase tracking-wide">Members</h4>
            <div className="space-y-1">
                {members.map(member => (
                    <div key={member.userId} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-[#2b2b2b] rounded-lg cursor-pointer">
                        <div className="relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold bg-slate-400`}>
                                {getInitials(member.username)}
                            </div>
                            {member.isOnline && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#212121] rounded-full"></div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {member.username} 
                                    {member.userId === user.id && <span className="text-slate-400 ml-1">(You)</span>}
                                </span>
                                {member.role === 'admin' && <span className="text-[10px] text-blue-500 font-bold border border-blue-500 px-1 rounded">ADMIN</span>}
                            </div>
                            <p className="text-xs text-blue-500 dark:text-blue-400">
                                {member.isOnline ? 'online' : member.lastSeen || 'offline'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Video Call Overlay */}
      {isInCall && (
        <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col">
            {/* Header */}
            <div className="flex-none p-4 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                        {getInitials(groupDetails?.name || currentHobby)}
                    </div>
                    <span className="text-white font-medium">{groupDetails?.name || 'Group Call'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold animate-pulse">
                        LIVE
                    </div>
                    <button 
                        onClick={() => setShowCallSettings(!showCallSettings)}
                        className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                        title="Video Settings"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            {showCallSettings && (
                <div className="bg-black/80 backdrop-blur-md border-b border-white/10 p-4 absolute top-16 left-0 right-0 z-50 animate-in slide-in-from-top-5">
                    <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block flex items-center gap-2">
                                <Video size={14} /> Camera Source
                            </label>
                            <div className="relative">
                                <select 
                                    value={selectedCameraId} 
                                    onChange={(e) => updateStream(e.target.value, videoQuality)}
                                    className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                >
                                    {cameras.map(cam => (
                                        <option key={cam.deviceId} value={cam.deviceId}>
                                            {cam.label || `Camera ${cam.deviceId.slice(0, 4)}...`}
                                        </option>
                                    ))}
                                    {cameras.length === 0 && <option value="">Default Camera</option>}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block flex items-center gap-2">
                                <Monitor size={14} /> Video Quality
                            </label>
                            <div className="flex bg-white/10 rounded-lg p-1 border border-white/20">
                                {(['low', 'medium', 'high'] as VideoQuality[]).map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => updateStream(selectedCameraId, q)}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${videoQuality === q ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Grid */}
            <div className="flex-1 p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto">
                {/* My Local Video */}
                <div className="relative bg-black rounded-xl overflow-hidden shadow-lg aspect-video ring-2 ring-blue-500 group">
                    <video 
                        ref={localVideoRef} 
                        autoPlay 
                        muted 
                        playsInline
                        className={`w-full h-full object-cover transform scale-x-[-1] ${isCameraOff ? 'hidden' : 'block'}`}
                    />
                    {isCameraOff && (
                        <div className="absolute inset-0 flex items-center justify-center">
                             <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-white text-2xl font-bold">
                                {getInitials(user.username)}
                            </div>
                        </div>
                    )}
                    <div className="absolute bottom-3 left-3 text-white text-sm font-medium bg-black/50 px-2 py-1 rounded backdrop-blur-md">
                        You {isMuted && '(Muted)'}
                    </div>
                    {/* Quick Switch Button for Local View */}
                    {cameras.length > 1 && (
                        <button 
                            onClick={switchCamera}
                            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Switch Camera"
                        >
                            <RefreshCw size={16} />
                        </button>
                    )}
                </div>

                {/* Simulated Remote Users */}
                {members.filter(m => m.userId !== user.id && m.isOnline).slice(0, 5).map(member => (
                    <div key={member.userId} className="relative bg-slate-800 rounded-xl overflow-hidden shadow-lg aspect-video flex flex-col items-center justify-center">
                        <div className={`w-20 h-20 rounded-full bg-slate-600 flex items-center justify-center text-white text-2xl font-bold mb-2 ${Math.random() > 0.5 ? 'ring-4 ring-green-500/30 animate-pulse' : ''}`}>
                             {getInitials(member.username)}
                        </div>
                        <div className="absolute bottom-3 left-3 text-white text-sm font-medium bg-black/50 px-2 py-1 rounded backdrop-blur-md">
                            {member.username}
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls Bar */}
            <div className="flex-none p-6 flex justify-center items-center gap-6 bg-black/40 backdrop-blur-lg">
                <button 
                    onClick={toggleCamera}
                    className={`p-4 rounded-full transition-colors ${isCameraOff ? 'bg-white text-slate-900' : 'bg-slate-700/50 text-white hover:bg-slate-600'}`}
                >
                    {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
                
                <button 
                    onClick={handleEndCall}
                    className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transform hover:scale-105 transition-all"
                >
                    <PhoneOff size={32} />
                </button>

                <button 
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-white text-slate-900' : 'bg-slate-700/50 text-white hover:bg-slate-600'}`}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
            </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && messageToReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-[#212121] w-full max-w-sm rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">Report Message</h3>
                      <button onClick={() => setShowReportModal(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-4 max-h-[60vh] overflow-y-auto">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                          Why are you reporting this message from <span className="font-bold text-slate-900 dark:text-white">{messageToReport.username}</span>?
                      </p>
                      
                      <div className="space-y-3">
                          {Object.values(ReportReason).map((reason) => (
                              <label key={reason} className="flex items-center gap-3 cursor-pointer group">
                                  <div className="relative flex items-center">
                                      <input 
                                          type="radio" 
                                          name="reportReason" 
                                          value={reason} 
                                          checked={reportReason === reason}
                                          onChange={(e) => setReportReason(e.target.value)}
                                          className="peer h-4 w-4 border-slate-300 text-red-600 focus:ring-red-600"
                                      />
                                  </div>
                                  <span className="text-slate-700 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                      {reason}
                                  </span>
                              </label>
                          ))}
                      </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#1a1a1a] flex justify-end gap-3">
                      <button 
                          onClick={() => setShowReportModal(false)}
                          className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={handleSubmitReport}
                          disabled={!reportReason}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm shadow-sm"
                      >
                          Report
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default ChatRoom;
