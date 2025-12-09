import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, HobbyType } from '../types';
import { HOBBIES } from '../constants';
import { Users, ArrowRight } from 'lucide-react';

interface LobbyProps {
  user: User;
}

const Lobby: React.FC<LobbyProps> = ({ user }) => {
  const navigate = useNavigate();

  const handleJoin = (hobbyId: string) => {
    // Navigate to the groups listing page for this hobby
    navigate(`/hobby/${encodeURIComponent(hobbyId)}`);
  };

  // Sort hobbies: user's hobby first, then others
  const sortedHobbies = [...HOBBIES].sort((a, b) => {
    if (a.id === user.hobby) return -1;
    if (b.id === user.hobby) return 1;
    return 0;
  });

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Explore Communities</h2>
        <p className="text-slate-600 dark:text-slate-400">Find your tribe and start creating.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedHobbies.map((hobby) => {
          const isUserHobby = hobby.id === user.hobby;
          
          return (
            <div 
              key={hobby.id}
              onClick={() => handleJoin(hobby.id)}
              className={`
                group relative overflow-hidden p-6 rounded-2xl transition-all duration-300 cursor-pointer border
                ${isUserHobby 
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-transparent shadow-xl shadow-violet-500/30 transform hover:-translate-y-1' 
                  : 'bg-white dark:bg-slate-800 border-white/20 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg hover:-translate-y-1'
                }
              `}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-4xl">{hobby.icon}</span>
                {isUserHobby && (
                  <span className="px-2 py-1 bg-white/20 rounded-lg text-xs font-semibold backdrop-blur-sm">
                    YOUR HOBBY
                  </span>
                )}
              </div>
              
              <h3 className={`text-lg font-bold mb-1 ${isUserHobby ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {hobby.label}
              </h3>
              
              <div className={`flex items-center text-sm ${isUserHobby ? 'text-violet-100' : 'text-slate-500 dark:text-slate-400'}`}>
                <Users size={16} className="mr-1" />
                <span>View Groups</span>
              </div>

              <div className={`
                absolute bottom-4 right-4 p-2 rounded-full transition-all duration-300 opacity-0 transform translate-x-4 group-hover:opacity-100 group-hover:translate-x-0
                ${isUserHobby ? 'bg-white text-violet-600' : 'bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-300'}
              `}>
                <ArrowRight size={20} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Lobby;