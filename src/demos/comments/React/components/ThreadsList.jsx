import { useThreadsState } from '../context.jsx'
import { ThreadsListItem } from './ThreadsListItem.jsx'

export const ThreadsList = ({ provider, threads }) => {
  const { selectedThreads, selectedThread } = useThreadsState()

  if (threads.length === 0) {
    return <label className="label">No threads.</label>
  }

  return (
    <div className="threads-group">
      {threads.map(t => (
        <ThreadsListItem
          key={t.id}
          thread={t}
          active={selectedThreads.includes(t.id) || selectedThread === t.id}
          open={selectedThread === t.id}
          provider={provider}
        />
      ))}
    </div>
  )
}
