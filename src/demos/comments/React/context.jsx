import { createContext, useCallback, useContext } from "react";

export const ThreadsContext = createContext({
  threads: [],
  selectedThreads: [],
  selectedThread: null,

  onClickThread: () => null,
  deleteThread: () => null,
  resolveThread: () => null,
  unresolveThread: () => null,
  onUpdateComment: () => null,
  onHoverThread: () => null,
  onLeaveThread: () => null,
});

export const ThreadsProvider = ({
  children,
  threads = [],
  selectedThreads = [],
  selectedThread = null,
  onClickThread = () => null,
  onDeleteThread = () => null,
  onResolveThread = () => null,
  onUnresolveThread = () => null,
  onUpdateComment = () => null,
  onHoverThread = () => null,
  onLeaveThread = () => null,
  setSelectedThread = () => null,
}) => {
  const handleThreadClick = useCallback(
    (threadId) => {
      setSelectedThread((currentThreadId) => {
        if (currentThreadId !== threadId) {
          onClickThread(threadId);
          setSelectedThread(threadId);
        }

        return currentThreadId !== threadId ? threadId : null;
      });
    },
    [onClickThread, setSelectedThread],
  );

  const providerValue = {
    threads,
    selectedThreads,
    selectedThread,

    deleteThread: onDeleteThread,
    resolveThread: onResolveThread,
    unresolveThread: onUnresolveThread,
    onClickThread: handleThreadClick,
    onUpdateComment,
    onHoverThread,
    onLeaveThread,
  };

  return (
    <ThreadsContext.Provider value={providerValue}>
      {children}
    </ThreadsContext.Provider>
  );
};

export const useThreadsState = () => {
  return useContext(ThreadsContext);
};
