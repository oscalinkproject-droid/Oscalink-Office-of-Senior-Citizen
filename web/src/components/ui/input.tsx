"use client";

import { ReactNode } from "react";

export function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
  className,
  ...props
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      {...props}
    />
  );
}

export function Select({
  value,
  onChange,
  className,
  children,
  disabled,
  ...props
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </select>
  );
}

export function SelectOption({
  value,
  children,
  className,
  ...props
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <option
      value={value}
      className={className}
      {...props}
    >
      {children}
    </option>
  );
}

export function Textarea({
  value,
  onChange,
  rows = 3,
  placeholder,
  className,
  disabled,
  ...props
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      {...props}
    />
  );
}