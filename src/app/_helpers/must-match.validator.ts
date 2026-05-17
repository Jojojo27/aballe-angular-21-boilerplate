import { AbstractControl } from '@angular/forms';

// custom validator to check that two fields match
export function MustMatch(controlName: string, matchingControlName: string) {
  return (group: AbstractControl) => {
    const control = group.get(controlName);
    const matchingControl = group.get(matchingControlName);

    if (!control || !matchingControl) {
      return null;
    }

    // return if another validator has already found an error on the matchingControl
    if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
      return null;
    }

    // set error on matchingControl if validation fails
    if (control.value !== matchingControl.value) {
      matchingControl.setErrors({ ...(matchingControl.errors || {}), mustMatch: true });
    } else {
      if (matchingControl.errors) {
        const { mustMatch, ...otherErrors } = matchingControl.errors;
        matchingControl.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
      }
    }

    return null;
  };
}
