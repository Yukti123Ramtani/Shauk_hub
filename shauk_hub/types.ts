
export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // Added for authentication
  hobby: string;
  customHobby?: string;
  country: string;
  avatar?: string;
  isVerified?: boolean; // New security flag
}

export interface Group {
  id: string;
  hobbyId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: number;
  membersCount?: number; // Simulated
}

export interface Member {
  userId: string;
  username: string;
  isOnline: boolean;
  lastSeen?: string;
  role: 'admin' | 'member';
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'file';
  url: string; // Base64 or external URL
  name?: string;
  size?: number;
  isSticker?: boolean;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  attachment?: Attachment;
}

export enum HobbyType {
  Pottery = "Pottery",
  JewelleryMaking = "Jewellery Making",
  SculptureMaking = "Sculpture Making",
  Poetry = "Poetry",
  CreativeWriting = "Creative Writing",
  Coding = "Coding",
  Sports = "Sports (Indoor)",
  FashionDesigning = "Fashion Designing",
  YogaMeditation = "Yoga and Meditation",
  Fitness = "Fitness",
  Others = "Others"
}

export interface ChatRoomState {
  messages: Message[];
  activeUsers: number;
}

export enum ReportReason {
  Dislike = "I don't like it",
  ChildAbuse = "Child abuse",
  Violence = "Violence",
  IllegalGoods = "Illegal goods and services",
  AdultContent = "Illegal adult content",
  PersonalData = "Personal data",
  ScamFraud = "Scam or fraud",
  Copyright = "Copyright",
  Spam = "Spam",
  Other = "Other"
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId?: string; // Optional if reporting the whole group
  reportedUserName?: string;
  messageId?: string;
  messageContent?: string; // Snapshot of content for investigation
  groupId: string;
  reason: string; // From ReportReason
  timestamp: number;
  status: 'pending' | 'investigating' | 'resolved';
}
