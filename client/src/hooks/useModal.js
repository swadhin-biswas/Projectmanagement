import { useCallback, useEffect, useRef, useState } from 'react';
import { useKeyPressEvent } from 'react-use';

export function useModal(options = {}) {
  const {
    initialOpen = false,
    onOpen,
    onClose,
    preventScroll = true,
    closeOnEsc = true,
    closeOnOutsideClick = true
  } = options;

  const [isOpen, setIsOpen] = useState(initialOpen);
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();

    // Store the currently focused element
    previousActiveElement.current = document.activeElement;

    if (preventScroll) {
      document.body.style.overflow = 'hidden';
    }
  }, [onOpen, preventScroll]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();

    if (preventScroll) {
      document.body.style.overflow = '';
    }

    // Return focus to the previously focused element
    if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [onClose, preventScroll]);

  const toggle = useCallback(() => {
    isOpen ? close() : open();
  }, [isOpen, open, close]);

  // Handle Escape key press
  useKeyPressEvent('Escape', (e) => {
    if (closeOnEsc && isOpen) {
      e.preventDefault();
      close();
    }
  });

  // Handle clicks outside the modal
  useEffect(() => {
    if (!closeOnOutsideClick || !isOpen) return;

    const handleOutsideClick = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        close();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, close, closeOnOutsideClick]);

  // Handle focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    firstFocusable?.focus();

    return () => modal.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  return {
    isOpen,
    open,
    close,
    toggle,
    modalRef
  };
}