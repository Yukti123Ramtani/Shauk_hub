
import { Message, User, Group, Member, Report } from "../types";

const STORAGE_KEYS = {
  USERS: 'hobbyhub_users',
  CURRENT_USER: 'hobbyhub_current_user',
  MESSAGES: 'hobbyhub_messages_', // prefix for room specific messages
  GROUPS: 'hobbyhub_groups',
  REPORTS: 'hobbyhub_reports'
};

// --- OTP SECURITY SIMULATION ---
export const generateMockOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// User Management
export const registerUser = (user: User): boolean => {
  const users = getUsers();
  if (users.some(u => u.email === user.email || u.username === user.username)) {
    return false;
  }
  
  // Mark user as verified since they passed the OTP check in the UI before calling this
  const verifiedUser = { ...user, isVerified: true };
  
  users.push(verifiedUser);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  return true;
};

// Check if a user exists (for pre-registration validation)
export const checkUserExists = (email: string, username: string): boolean => {
    const users = getUsers();
    return users.some(u => u.email === email || u.username === username);
};

export const loginUser = (email: string, password?: string): User | undefined => {
  const users = getUsers();
  // Basic matching. In production, password should be hashed.
  return users.find(u => u.email === email && (!u.password || u.password === password));
};

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.USERS);
  return stored ? JSON.parse(stored) : [];
};

export const saveCurrentUser = (user: User) => {
  // Don't store password in session/current user storage for security hygiene (even in mock)
  const safeUser = { ...user };
  delete safeUser.password;
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(safeUser));
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return stored ? JSON.parse(stored) : null;
};

export const logoutUser = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

// Group Management
export const getGroups = (hobbyId: string): Group[] => {
  const allGroups: Group[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GROUPS) || '[]');
  const hobbyGroups = allGroups.filter(g => g.hobbyId === hobbyId);
  
  // If no groups exist, create a default "General" group
  if (hobbyGroups.length === 0) {
      const defaultGroup: Group = {
          id: `${hobbyId}-general`,
          hobbyId,
          name: 'General Discussion',
          description: 'The main gathering place for everyone.',
          createdBy: 'system',
          createdAt: Date.now(),
          membersCount: Math.floor(Math.random() * 50) + 5
      };
      // Save it directly so we don't recurse
      allGroups.push(defaultGroup);
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(allGroups));
      return [defaultGroup];
  }
  return hobbyGroups;
};

export const createGroup = (group: Group): void => {
    const allGroups: Group[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GROUPS) || '[]');
    allGroups.push(group);
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(allGroups));

    // Notify other tabs/components about the new group
    window.dispatchEvent(new CustomEvent('hobbyhub_group_created', { 
        detail: { group } 
    }));
};

export const getGroupDetails = (groupId: string): Group | undefined => {
    const allGroups: Group[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GROUPS) || '[]');
    return allGroups.find(g => g.id === groupId);
};

// Simulated Group Members
export const getGroupMembers = (groupId: string): Member[] => {
    // In a real app, this would query the DB. Here we mock it based on registered users + randoms
    const realUsers = getUsers().map(u => ({
        userId: u.id,
        username: u.username,
        isOnline: Math.random() > 0.5,
        lastSeen: 'Recently',
        role: 'member' as const
    }));
    
    // Add some fake bots/users to populate list
    const fakeUsers: Member[] = [
        { userId: 'admin-1', username: 'GroupAdmin', isOnline: true, role: 'admin' },
        { userId: 'bot-1', username: 'HobbyBot', isOnline: true, role: 'member' },
        { userId: 'user-x', username: 'Alice', isOnline: false, lastSeen: '2 hours ago', role: 'member' },
        { userId: 'user-y', username: 'Bob', isOnline: false, lastSeen: '1 day ago', role: 'member' },
    ];

    return [...fakeUsers, ...realUsers];
};

// Reporting System
export const submitReport = (report: Report): void => {
    const reports: Report[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');
    reports.push(report);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    
    // Fetch group to find creator
    const allGroups: Group[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GROUPS) || '[]');
    const group = allGroups.find(g => g.id === report.groupId);
    const creator = group ? group.createdBy : 'Unknown';
    
    // Simulate notification to admin/creator and log details
    console.log("%c--- NEW REPORT RECEIVED ---", "color: red; font-weight: bold; font-size: 14px;");
    console.log(`%cReason: ${report.reason}`, "font-weight: bold;");
    console.table({
        "Report ID": report.id,
        "Timestamp": new Date(report.timestamp).toLocaleString(),
        "Reporter ID": report.reporterId,
        "Reporter Name": report.reporterName,
        "Reported User ID": report.reportedUserId || 'N/A',
        "Reported Username": report.reportedUserName || 'N/A',
        "Message ID": report.messageId || 'N/A',
        "Group ID": report.groupId,
    });
    console.log("Message Content:", report.messageContent || '[No content]');
    console.log(`%cAction: Notifying Group Creator (User ID: ${creator}) and Admins (HobbyHub Team)...`, "color: blue;");
    console.log("Status: Logged for investigation.");
    console.log("-----------------------------------------");
};

// Chat Management
export const getMessages = (roomId: string): Message[] => {
  const key = `${STORAGE_KEYS.MESSAGES}${roomId}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

export const addMessage = (roomId: string, message: Message) => {
  try {
      const messages = getMessages(roomId);
      messages.push(message);
      // Keep last 50 messages to prevent storage overflow
      const trimmed = messages.slice(-50);
      localStorage.setItem(`${STORAGE_KEYS.MESSAGES}${roomId}`, JSON.stringify(trimmed));
      
      // Dispatch a custom event to notify other tabs/components
      window.dispatchEvent(new CustomEvent('hobbyhub_new_message', { 
        detail: { roomId, message } 
      }));
  } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          console.error("Storage full! Cannot send message.");
          alert("Attachment too large for local browser storage. Please try a smaller image.");
      } else {
          console.error("Error saving message:", e);
      }
  }
};
