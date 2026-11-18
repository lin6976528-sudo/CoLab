import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, CheckCircle2, MessageSquare, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface RatingFeedbackProps {
  featureId: string;
  responseId?: string; // Optional unique key for the response to persist rating specifically
  onRate?: (rating: 'like' | 'dislike' | null) => void;
  className?: string;
  prompt?: string;
  response?: string;
}

export default function RatingFeedback({
  featureId,
  responseId,
  onRate,
  className = '',
  prompt,
  response,
}: RatingFeedbackProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  
  // Use a composite key for local storage persistence if responseId is available
  const storageKey = responseId 
    ? `rating_${featureId}_${responseId}` 
    : `rating_session_${featureId}`;

  const [rating, setRating] = useState<'like' | 'dislike' | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'like' || saved === 'dislike') return saved;
    } catch (e) {
      // Ignore storage errors
    }
    return null;
  });

  const [firebaseDocId, setFirebaseDocId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSubmitted, setCommentSubmitted] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleRate = async (newRating: 'like' | 'dislike') => {
    // If clicking the same rating, toggle it off
    const finalRating = rating === newRating ? null : newRating;
    setRating(finalRating);

    try {
      if (finalRating) {
        localStorage.setItem(storageKey, finalRating);
        // Show a brief delightful confirmation toast when they provide a new rating
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
        setShowCommentBox(true);
        setCommentSubmitted(false);
      } else {
        localStorage.removeItem(storageKey);
        setShowCommentBox(false);
      }
    } catch (e) {
      // Ignore storage errors
    }

    // sync to firebase if user is authenticated
    if (finalRating && currentUser) {
      try {
        const ratingVal = finalRating === 'like' ? 'up' : 'down';
        if (firebaseDocId) {
          const docRef = doc(db, 'feedback', firebaseDocId);
          await updateDoc(docRef, {
            rating: ratingVal,
            updatedAt: serverTimestamp(),
          });
        } else {
          const docRef = await addDoc(collection(db, 'feedback'), {
            userId: currentUser.uid,
            toolId: featureId,
            contentId: responseId || '',
            rating: ratingVal,
            prompt: prompt || '',
            response: response || '',
            comment: comment || '',
            createdAt: serverTimestamp(),
          });
          setFirebaseDocId(docRef.id);
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, 'feedback');
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (onRate) {
      onRate(finalRating);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !currentUser) return;

    setIsSubmittingComment(true);
    try {
      const ratingVal = rating === 'like' ? 'up' : 'down';
      if (firebaseDocId) {
        const docRef = doc(db, 'feedback', firebaseDocId);
        await updateDoc(docRef, {
          comment: comment.trim(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const docRef = await addDoc(collection(db, 'feedback'), {
          userId: currentUser.uid,
          toolId: featureId,
          contentId: responseId || '',
          rating: ratingVal,
          prompt: prompt || '',
          response: response || '',
          comment: comment.trim(),
          createdAt: serverTimestamp(),
        });
        setFirebaseDocId(docRef.id);
      }
      setCommentSubmitted(true);
      setComment('');
      setTimeout(() => {
        setShowCommentBox(false);
      }, 3000);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, 'feedback');
      } catch (e) {
        console.error(e);
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center py-4 px-6 border-t border-zinc-100 dark:border-zinc-800/50 w-full ${className}`}>
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between w-full max-w-lg">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tracking-wide">
          {t('common.rateResponse', '滿意此回饋與生成品質嗎？')}
        </span>
        
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => handleRate('like')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 ${
              rating === 'like'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/60 shadow-xs shadow-emerald-500/10'
                : 'bg-white/60 text-zinc-650 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            }`}
            title={t('common.rateLike', '非常好')}
            type="button"
          >
            <ThumbsUp 
              size={13} 
              className={`${rating === 'like' ? 'fill-emerald-500/15 stroke-[2.2]' : 'stroke-[1.8]'}`} 
            />
            <span>{t('common.qualityGood', '優質')}</span>
          </button>

          <button
            onClick={() => handleRate('dislike')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 ${
              rating === 'dislike'
                ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/60 shadow-xs shadow-rose-500/10'
                : 'bg-white/60 text-zinc-650 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            }`}
            title={t('common.rateDislike', '有待改進')}
            type="button"
          >
            <ThumbsDown 
              size={13} 
              className={`${rating === 'dislike' ? 'fill-rose-500/15 stroke-[2.2]' : 'stroke-[1.8]'}`} 
            />
            <span>{t('common.qualityBad', '不滿意')}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={`mt-3 flex items-center gap-2 py-1.5 px-4 rounded-xl text-xs font-medium border ${
              rating === 'like'
                ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10'
                : 'bg-zinc-500/5 text-zinc-550 dark:text-zinc-400 border-zinc-500/10'
            }`}
          >
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>
              {rating === 'like'
                ? t('common.rateThanksLike', '感謝您的肯定！我們會持續保持良好品質。')
                : t('common.rateThanksDislike', '已收到您的回饋，系統將持續調整以改善生成效果。')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCommentBox && currentUser && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleCommentSubmit}
            className="w-full max-w-lg mt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800/60 pt-4 overflow-hidden"
          >
            {commentSubmitted ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40"
              >
                <CheckCircle2 size={14} className="stroke-[2.5]" />
                <span>{t('common.feedbackSubmitted', '詳細回饋意見已成功送出，感謝您！')}</span>
              </motion.div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-zinc-400" />
                  <span>
                    {rating === 'like' 
                      ? t('common.likeFeedbackCall', '要分享您喜歡這哪一點，或提供建議嗎？（選填）')
                      : t('common.dislikeFeedbackCall', '請告訴我們哪裡不滿意，或需要如何改進？（選填）')}
                  </span>
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={rating === 'like' ? '例如：生成速度很快、內容很實用...' : '例如：內容不符、格式混亂、回覆有誤...'}
                    maxLength={1000}
                    className="flex-1 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs bg-white/50 dark:bg-zinc-950/20 focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 outline-none resize-none h-14 placeholder:text-zinc-400 max-w-full"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !comment.trim()}
                    className="shrink-0 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isSubmittingComment ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
