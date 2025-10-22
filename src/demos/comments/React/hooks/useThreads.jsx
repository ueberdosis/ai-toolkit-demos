import { subscribeToThreads } from '@tiptap-pro/extension-comments'
import { useCallback, useEffect, useState } from 'react'

export const useThreads = (provider, editor, user) => {
  const [threads, setThreads] = useState()

  useEffect(() => {
    if (provider) {
      const unsubscribe = subscribeToThreads({
        provider,
        callback: currentThreads => {
          setThreads(currentThreads)
        },
      })

      return () => {
        unsubscribe()
      }
    }
  }, [provider])

  const createThread = useCallback(() => {
    const input = window.prompt('Comment content')

    if (!input) {
      return
    }

    if (!editor) {
      return
    }

    editor
      .chain()
      .focus()
      .setThread({ content: input, commentData: { userName: user.name } })
      .run()
  }, [editor, user])

  return { threads, createThread }
}
