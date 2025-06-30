import  { useState, useRef, useEffect } from 'react';
import { User, LogOut, History, Settings, ChevronDown, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { useSubscription } from '../context/SubscriptionContext';
import ResumeHistoryModal from './ResumeHistoryModal';
import SubscriptionModal from './SubscriptionModal';
import FeatureGate from './FeatureGate';

const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const { userProfile } = useUser();
  const { subscription } = useSubscription();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      setIsOpen(false);
      await signOut();
      // The AuthContext will handle clearing session storage and redirecting
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleHistoryClick = () => {
    setShowHistory(true);
    setIsOpen(false);
  };

  if (!user) return null;

  const isPremium = subscription?.isPremium || subscription?.isAdmin;
  const planType = subscription?.planType || 'free';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isPremium ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-green-600'
          }`}>
            {isPremium ? (
              <Crown className="w-4 h-4 text-white" />
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 flex items-center">
              {userProfile?.full_name || user.email?.split('@')[0] || 'User'}
              {subscription?.isAdmin && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                  Admin
                </span>
              )}
              {isPremium && !subscription?.isAdmin && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  Premium
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                {userProfile?.full_name || 'User'}
              </p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isPremium 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {planType.toUpperCase()} Plan
                </span>
                {!isPremium && (
                  <button
                    onClick={() => {
                      setShowSubscription(true);
                      setIsOpen(false);
                    }}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleHistoryClick}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <History className="w-4 h-4 mr-3" />
              Resume History
              {!isPremium && (
                <Crown className="w-3 h-3 ml-auto text-yellow-500" />
              )}
            </button>

            <button
              onClick={() => {
                setShowSubscription(true);
                setIsOpen(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Crown className="w-4 h-4 mr-3" />
              {isPremium ? 'Manage Subscription' : 'Upgrade to Premium'}
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4 mr-3" />
              Settings
            </button>

            <div className="border-t border-gray-200 my-1"></div>

            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {showHistory && (
        <FeatureGate 
          feature="resume_history"
          fallback={null} // Don't show anything if user doesn't have access
        >
          <ResumeHistoryModal
            onClose={() => setShowHistory(false)}
          />
        </FeatureGate>
      )}

      {showSubscription && (
        <SubscriptionModal
          onClose={() => setShowSubscription(false)}
          title={isPremium ? "Manage Your Subscription" : "Upgrade to Premium"}
          description={isPremium ? "Manage your premium subscription settings" : "Unlock all premium features"}
        />
      )}
    </>
  );
};

export default UserMenu;