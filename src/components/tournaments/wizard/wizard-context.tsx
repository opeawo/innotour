"use client";

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
import { type WizardData, defaultWizardData } from "@/lib/validators/tournament";

export type WizardState = {
  tournamentId: string | null;
  currentStep: number;
  completedSteps: number[];
  isDirty: boolean;
  data: WizardData;
};

type WizardAction =
  | { type: "SET_TOURNAMENT_ID"; id: string }
  | { type: "SET_CURRENT_STEP"; step: number }
  | { type: "SET_STEP_DATA"; key: keyof WizardData; data: WizardData[keyof WizardData] }
  | { type: "MARK_STEP_COMPLETE"; step: number }
  | { type: "SET_DIRTY"; dirty: boolean }
  | { type: "HYDRATE"; state: Partial<WizardState> };

const initialState: WizardState = {
  tournamentId: null,
  currentStep: 1,
  completedSteps: [],
  isDirty: false,
  data: defaultWizardData,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_TOURNAMENT_ID":
      return { ...state, tournamentId: action.id };
    case "SET_CURRENT_STEP":
      return { ...state, currentStep: action.step };
    case "SET_STEP_DATA":
      return {
        ...state,
        isDirty: true,
        data: { ...state.data, [action.key]: action.data },
      };
    case "MARK_STEP_COMPLETE":
      return {
        ...state,
        isDirty: false,
        completedSteps: state.completedSteps.includes(action.step)
          ? state.completedSteps
          : [...state.completedSteps, action.step],
      };
    case "SET_DIRTY":
      return { ...state, isDirty: action.dirty };
    case "HYDRATE":
      return { ...state, ...action.state };
    default:
      return state;
  }
}

const WizardContext = createContext<WizardState>(initialState);
const WizardDispatchContext = createContext<Dispatch<WizardAction>>(() => {});

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  return (
    <WizardContext.Provider value={state}>
      <WizardDispatchContext.Provider value={dispatch}>
        {children}
      </WizardDispatchContext.Provider>
    </WizardContext.Provider>
  );
}

export function useWizard() {
  return useContext(WizardContext);
}

export function useWizardDispatch() {
  return useContext(WizardDispatchContext);
}
