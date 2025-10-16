import { useCallback, useMemo } from 'react'

import { useThreadsState } from '../context.jsx'
import { CommentCard } from './CommentCard.jsx'
import { ThreadCard } from './ThreadCard.jsx'
import { ThreadComposer } from './ThreadComposer.jsx'

export const ThreadsListItem = ({ thread, provider, active, open }) => {
  const { onClickThread, deleteThread, onHoverThread, onLeaveThread, resolveThread, unresolveThread } =
    useThreadsState()
  const classNames = ['threadsList--item']

  if (active || open) {
    classNames.push('threadsList--item--active')
  }

  const comments = useMemo(() => provider.getThreadComments(thread.id, true), [provider, thread])

  const firstComment = comments?.[0]

  const handleDeleteClick = useCallback(() => {
    deleteThread(thread.id)
  }, [thread.id, deleteThread])

  const handleResolveClick = useCallback(() => {
    resolveThread(thread.id)
  }, [thread.id, resolveThread])

  const handleUnresolveClick = useCallback(() => {
    unresolveThread(thread.id)
  }, [thread.id, unresolveThread])

  const editComment = useCallback(
    (commentId, val) => {
      provider.updateComment(thread.id, commentId, { content: val })
    },
    [provider, thread.id],
  )

  const deleteComment = useCallback(
    commentId => {
      provider.deleteComment(thread.id, commentId, { deleteContent: true })
    },
    [provider, thread.id],
  )

  return (
    <div onMouseEnter={() => onHoverThread(thread.id)} onMouseLeave={() => onLeaveThread()}>
      <ThreadCard
        id={thread.id}
        active={active}
        open={open}
        onClick={!open ? onClickThread : null}
        // onClickOutside
      >
        {open ? (
          <>
            <div className="header-group">
              <div className="button-group">
                {!thread.resolvedAt ? (
                  <button type="button" onClick={handleResolveClick}>
                    ✓ Resolve
                  </button>
                ) : (
                  <button type="button" onClick={handleUnresolveClick}>
                    ⟲ Unresolve
                  </button>
                )}
                <button type="button" onClick={handleDeleteClick}>
                  × Delete
                </button>
              </div>
            </div>

            {thread.resolvedAt ? (
              <div className="hint">
                💡 Resolved at {new Date(thread.resolvedAt).toLocaleDateString()}{' '}
                {new Date(thread.resolvedAt).toLocaleTimeString()}
              </div>
            ) : null}

            <div className="comments-group">
              {comments.map(comment => (
                <CommentCard
                  key={comment.id}
                  name={comment.data.userName}
                  content={comment.deletedAt ? null : comment.content}
                  createdAt={comment.createdAt}
                  deleted={comment.deletedAt}
                  onEdit={val => {
                    if (val) {
                      editComment(comment.id, val)
                    }
                  }}
                  onDelete={() => {
                    deleteComment(comment.id)
                  }}
                  showActions={true}
                />
              ))}
            </div>
            <div className="reply-group">
              <ThreadComposer threadId={thread.id} provider={provider} />
            </div>
          </>
        ) : null}

        {!open && firstComment && firstComment.data ? (
          <div className="comments-group">
            <CommentCard
              key={firstComment.id}
              name={firstComment.data.userName}
              content={firstComment.content}
              createdAt={firstComment.createdAt}
              deleted={firstComment.deletedAt}
              onEdit={val => {
                if (val) {
                  editComment(firstComment.id, val)
                }
              }}
            />
            <div className="comments-count">
              <label>
                {Math.max(0, comments.length - 1) || 0} {(comments.length - 1 || 0) === 1 ? 'reply' : 'replies'}
              </label>
            </div>
          </div>
        ) : null}
      </ThreadCard>
    </div>
  )
}
