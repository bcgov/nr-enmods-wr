/* eslint-disable prettier/prettier */
import { ReactElement, useState } from "react"

export function useMultiStepForm(steps: ReactElement[]) {
  const [activeStep, setActiveStep] = useState(0)

  function next() {
    setActiveStep((currentStep) => {
      if (currentStep >= steps.length - 1) return currentStep
      return currentStep + 1
    })
  }

  function back() {
    setActiveStep((currentStep) => {
      if (currentStep <= 0) return currentStep
      return currentStep - 1
    })
  }

  function goToPage() {
    setActiveStep(0);
    return steps[activeStep];

  }

  return {
    activeStep,
    next,
    back,
    step: steps[activeStep],
    steps,
    isLastStep: activeStep === steps.length - 1,
    isFirstStep: activeStep === 0,
    goToPage
    
  }
}
