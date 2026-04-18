# Design Doc: Leave Request Card Redesign (Standardized Institutional Style)

## Goal
Modernize the "Request Leave" form in the Employee Portal to match the premium, standardized institutional design language used in HR and Admin modules.

## User Experience
- **Visual Clarity**: Single-column vertical stack with prominent typography.
- **Feedback**: Real-time duration calculation and character counting.
- **Micro-interactions**: Subtle hover and active states for a premium feel.

## Component Design

### 1. Form Structure
- **Container**: `Modal` with standardized header and spacing.
- **Layout**: `flex flex-col gap-5` for the main form body.

### 2. Form Fields
- **Select (Leave Type)**: Rounded-xl, px-4 py-3, with custom focus rings.
- **Date Inputs**: Two-column responsive grid within the stack.
- **Textarea (Reason)**: Fixed height, disabled resizing, with a character counter header.

### 3. Typography & Tokens
- **Labels**: `text-[10px] font-black uppercase tracking-[0.2em] text-slate-400`
- **Errors**: `text-[10px] font-bold text-rose-600 uppercase tracking-tight`
- **Buttons**: `rounded-xl`, `transition-all`, `active:scale-95`.

## Data Flow
- **State Management**: `react-hook-form` remains the source of truth.
- **Calculations**: Derivative `durationDays` updates on date selection.

## Risks & Regressions
- **Responsive Width**: Ensure the modal doesn't become too cramped on mobile screens.
- **Date Validation**: Maintain existing safeguards against past dates.

## Verification
- Manual verification of duration logic.
- Visual inspection against the "New HR Request" reference card.
