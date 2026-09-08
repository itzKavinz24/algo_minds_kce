import React from 'react';
import VoiceInput from '../VoiceInput';

/**
 * Re-export VoiceInput as VoiceButton for backward compatibility
 */
export default function VoiceButton(props) {
  return <VoiceInput {...props} />;
}
