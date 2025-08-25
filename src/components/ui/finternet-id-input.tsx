import React, { useEffect, useState } from 'react';
import { getAllFinternetUsers, resolveFinternetId } from '../../lib/constants/finternetUsers';
import type { FinternetUser } from '../../types/demo';

interface FinternetIdInputProps {
  value: string;
  onChange: (finternetId: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  onUserSelect?: (user: FinternetUser | null) => void;
}

export function FinternetIdInput({
  value,
  onChange,
  placeholder = "Enter Finternet ID (e.g., abhishek@finternet.ae)",
  label = "Finternet ID",
  disabled = false,
  className = "",
  onUserSelect
}: FinternetIdInputProps) {
  const [isValid, setIsValid] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [filteredUsers, setFilteredUsers] = useState<Array<FinternetUser>>([]);

  // Validate Finternet ID format and resolve user
  useEffect(() => {
    if (!value) {
      setIsValid(false);
      setValidationMessage("");
      onUserSelect?.(null);
      return;
    }

    // Check format: should be like "name@finternet.country"
    const finternetIdPattern = /^[a-zA-Z0-9._%+-]+@finternet\.[a-zA-Z]{2,}$/;
    if (!finternetIdPattern.test(value)) {
      setIsValid(false);
      setValidationMessage("Invalid Finternet ID format. Use: name@finternet.country");
      onUserSelect?.(null);
      return;
    }

    // Try to resolve the user
    const user = resolveFinternetId(value);
    if (user) {
      setIsValid(true);
      setValidationMessage("✅ Valid Finternet ID");
      onUserSelect?.(user);
    } else {
      setIsValid(false);
      setValidationMessage("❌ User not found");
      onUserSelect?.(null);
    }
  }, [value, onUserSelect]);

  // Filter users based on input
  useEffect(() => {
    if (!value || value.length < 3) {
      setFilteredUsers([]);
      return;
    }

    const allUsers = getAllFinternetUsers();
    const filtered = allUsers.filter(user => 
      user.finternetId.toLowerCase().includes(value.toLowerCase()) ||
      user.displayName.toLowerCase().includes(value.toLowerCase()) ||
      user.country.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
  };

  const handleUserSelect = (user: FinternetUser) => {
    onChange(user.finternetId);
    setShowSuggestions(false);
    onUserSelect?.(user);
  };

  const handleInputFocus = () => {
    if (value.length >= 3) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className={`finternet-id-input ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-3 border rounded-lg text-lg font-mono
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${isValid ? 'border-green-500 bg-green-50' : 'border-gray-300'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
          `}
        />
        
        {/* Validation Status */}
        {validationMessage && (
          <div className={`mt-2 text-sm ${
            isValid ? 'text-green-600' : 'text-red-600'
          }`}>
            {validationMessage}
          </div>
        )}

        {/* User Suggestions Dropdown */}
        {showSuggestions && filteredUsers.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.finternetId}
                onClick={() => handleUserSelect(user)}
                className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="text-2xl mr-3">{user.flag}</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{user.finternetId}</div>
                  <div className="text-sm text-gray-600">
                    {user.displayName} • {user.country} • {user.jurisdiction}
                  </div>
                </div>
                <div className="flex flex-col items-end text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.kycLevel === 'Full' ? 'bg-green-100 text-green-800' :
                    user.kycLevel === 'Basic' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {user.kycLevel} KYC
                  </span>
                  <span className={`mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                    user.isSanctioned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {user.isSanctioned ? 'Sanctioned' : 'Clear'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FinternetIdInput;
