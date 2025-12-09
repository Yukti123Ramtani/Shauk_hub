
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Group } from '../types';
import { getGroups, createGroup } from '../services/storageService';
import { HOBBIES } from '../constants';
import { Plus, Users, MessageCircle, ArrowLeft, X, ArrowRight, Link as LinkIcon, Check, Copy } from 'lucide-react';

interface HobbyGroupsProps {
  user: User;
}

const HobbyGroups: React.FC<HobbyGroupsProps> = ({ user }) => {
  const { hobbyId } = useParams<{ hobbyId: string }>();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentHobbyId = decodeURIComponent(hobbyId || '');
  const hobbyInfo = HOBBIES.find(h => h.id === currentHobbyId);

  useEffect(() => {
    if (currentHobbyId) {
      setGroups(getGroups(currentHobbyId));
    }

    // Listen for new groups created in other tabs/windows
    const handleGroupCreated = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail?.group?.hobbyId === currentHobbyId) {
            setGroups(prev => {
                // Avoid duplicates
                if (prev.find(g => g.id === customEvent.detail.group.id)) return prev;
                return [...prev, customEvent.detail.group];
            });
        }
    };

    window.addEventListener('hobbyhub_group_created', handleGroupCreated);
    return () => window.removeEventListener('hobbyhub_group_created', handleGroupCreated);
  }, [currentHobbyId]);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !currentHobbyId) return;

    const newGroup: Group = {
      id: `${currentHobbyId}-${Date.now()}`,
      hobbyId: currentHobbyId,
      name: newGroupName,
      description: newGroupDesc || `A group for ${newGroupName} enthusiasts.`,
      createdBy: user.id,
      createdAt: Date.now(),
      membersCount: 1
    };

    createGroup(newGroup);
    setGroups(prev => [...prev, newGroup]);
    setShowCreateModal(false);
    setNewGroupName('');
    setNewGroupDesc('');
  };

  const handleJoinGroup = (groupId: string) => {
    navigate(`/chat/${encodeURIComponent(currentHobbyId)}/${encodeURIComponent(groupId)}`);
  };

  const handleCopyLink = (e: React.MouseEvent, group: Group) => {
    e.stopPropagation();
    // Construct the link based on the current window location (handles hash router)
    const baseUrl = window.location.href.split('#')[0];
    const link = `${baseUrl}#/chat/${encodeURIComponent(group.hobbyId)}/${encodeURIComponent(group.id)}`;
    
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(group.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full relative">
      {/* Toast Notification */}
      {copiedId && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg z-50 animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
            <Check size={16} className="text-green-400" /> Link copied to clipboard
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/lobby')}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
            <div className="flex items-center gap-2">
                <span className="text-3xl">{hobbyInfo?.icon}</span>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{hobbyInfo?.label || currentHobbyId} Groups</h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Select a group to start chatting or create your own topic.</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mb-8 flex justify-between items-end">
        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Available Groups</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Join a conversation that interests you</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl shadow-lg shadow-pink-500/30 transition-all active:scale-95"
        >
          <Plus size={20} />
          Create New Group
        </button>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => {
            const isCreator = group.createdBy === user.id;
            
            return (
              <div 
                key={group.id}
                onClick={() => handleJoinGroup(group.id)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:shadow-xl hover:border-pink-300 dark:hover:border-pink-700 transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
              >
                {isCreator && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wider">
                        Created by You
                    </div>
                )}
                
                <div>
                    <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors pr-8">
                            {group.name}
                        </h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                        {group.description}
                    </p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs font-medium text-slate-500 dark:text-slate-500">
                            <Users size={14} className="mr-1.5" />
                            {group.membersCount || 1} members
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => handleCopyLink(e, group)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                title="Copy Invite Link"
                            >
                                {copiedId === group.id ? <Check size={16} /> : <LinkIcon size={16} />}
                            </button>
                            <button className="flex items-center gap-1 text-sm font-semibold text-pink-600 dark:text-pink-400 group-hover:underline">
                                Join <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
              </div>
            );
        })}
      </div>

      {groups.length === 0 && (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <MessageCircle size={48} className="mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">No groups yet</h3>
              <p className="text-slate-500 mb-6">Be the first to create a community for this hobby!</p>
              <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              >
                  Create Group
              </button>
          </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create New Group</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Weekend Potters"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-pink-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="What is this group about?"
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-pink-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-medium shadow-lg shadow-pink-500/25"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HobbyGroups;
