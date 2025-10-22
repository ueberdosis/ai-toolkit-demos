import { useCallback, useState } from "react";

import { useUser } from "../hooks/useUser.jsx";

export const ThreadComposer = ({ threadId, provider }) => {
  const user = useUser();
  const [comment, setComment] = useState("");

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      if (!comment) {
        return;
      }

      if (provider) {
        provider.addComment(threadId, {
          content: comment,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          data: { userName: user.name },
        });

        setComment("");
      }
    },
    [comment, provider, threadId, user.name],
  );

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        placeholder="Reply to thread …"
        onChange={(e) => setComment(e.currentTarget.value)}
        value={comment}
      />
      <div className="flex-row">
        <div className="button-group">
          <button type="submit" className="primary" disabled={!comment.length}>
            Send
          </button>
        </div>
      </div>
    </form>
  );
};
