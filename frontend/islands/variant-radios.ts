/**
 * @file `<variant-radios>` — variant picker using radio button fieldsets.
 *
 * Extends {@link VariantSelects} and overrides `updateOptions()` to read
 * selected values from checked radio inputs within fieldsets, rather than
 * from `<select>` elements.
 */
import VariantSelects from './variant-selects'
import { must } from '@/lib/dom'

class VariantRadios extends VariantSelects {
  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'))
    this.options = fieldsets.map((fieldset) => {
      return must<HTMLInputElement>(fieldset, 'input:checked').value
    })
  }
}

window.customElements.define('variant-radios', VariantRadios)
