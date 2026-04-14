import React from 'react';

interface Props {
  id: string;
  currentStatus: string;
  onStatusChange: (id: string, status: string) => void;
}

export const StatusDropdown: React.FC<Props> = ({ id, currentStatus, onStatusChange }) => (
  <select value={currentStatus} onChange={(e) => onStatusChange(id, e.target.value)}>
    <option value="draft">Draft</option>
    <option value="ready">Ready</option>
    <option value="posted">Posted</option>
  </select>
);
