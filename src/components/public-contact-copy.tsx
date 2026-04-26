'use client';

import { useState } from 'react';

type PublicContactCopyProps = {
  contactHandle: string;
};

function copyWithSelection(value: string) {
  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.top = '-999px';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textArea);

  return copied;
}

export function PublicContactCopy({ contactHandle }: PublicContactCopyProps) {
  const [feedback, setFeedback] = useState('');

  const copyContactHandle = async () => {
    if (!contactHandle) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(contactHandle);
      } else if (!copyWithSelection(contactHandle)) {
        throw new Error('copy unavailable');
      }

      setFeedback('已复制，可去微信、电话或私信里联系我。');
    } catch {
      setFeedback('复制失败，请长按联系方式复制。');
    }
  };

  if (!contactHandle) {
    return <p>联系方式暂未公开，可以先通过 Livelink 认识我。</p>;
  }

  return (
    <div className="public-contact-copy">
      <p>联系方式：{contactHandle}</p>
      <button type="button" onClick={copyContactHandle}>
        复制联系方式
      </button>
      {feedback && <small aria-live="polite">{feedback}</small>}
    </div>
  );
}
