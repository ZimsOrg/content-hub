import React from 'react';
export const StatusDropdown = ({ id, currentStatus, onStatusChange }) => (
  <select value={currentStatus} onChange={(e) => onStatusChange(id, e.target.value)}>
    <option value="draft">Draft</option>
    <option value="ready">Ready</option>
    <option value="posted">Posted</option>
  </select>
);
