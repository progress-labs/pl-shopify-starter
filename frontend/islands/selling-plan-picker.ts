/**
 * Selling Plan Picker Island
 *
 * Expected DOM:
 *   <selling-plan-picker client:idle>
 *     <input type="radio" name="purchase_option" value="" checked>        <!-- one-time -->
 *     <input type="radio" name="purchase_option" value="{groupId}"
 *            data-default-plan="{planId}">                                <!-- subscription group -->
 *     <fieldset data-plan-group="{groupId}" hidden>                       <!-- multi-plan group -->
 *       <input type="radio" name="selling_plan_group_{groupId}" value="{planId}">
 *     </fieldset>
 *     <input type="hidden" name="selling_plan" form="product-form-{sectionId}">
 *   </selling-plan-picker>
 *
 * Output: Updates the hidden selling_plan input with the selected plan ID
 *         (empty string for one-time purchase).
 */
class SellingPlanPicker extends window.HTMLElement {
  constructor() {
    super()
    this.addEventListener('change', this.onChange.bind(this))
  }

  onChange(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.name === 'purchase_option') {
      this.onPurchaseOptionChange(input.value)
    } else if (input.name.startsWith('selling_plan_group_')) {
      this.updateHiddenInput(input.value)
    }
  }

  onPurchaseOptionChange(groupId: string) {
    // Hide all plan group fieldsets
    this.querySelectorAll<HTMLElement>('[data-plan-group]').forEach(
      (fieldset) => {
        fieldset.hidden = true
      }
    )

    if (!groupId) {
      // One-time purchase selected
      this.updateHiddenInput('')
      return
    }

    // Show the selected group's fieldset if it exists (multi-plan groups)
    const groupFieldset = this.querySelector<HTMLElement>(
      `[data-plan-group="${groupId}"]`
    )
    if (groupFieldset) {
      groupFieldset.hidden = false
      const checkedPlan =
        groupFieldset.querySelector<HTMLInputElement>('input:checked')
      this.updateHiddenInput(checkedPlan ? checkedPlan.value : '')
    } else {
      // Single plan group — use the default plan ID from the data attribute
      const groupRadio = this.querySelector<HTMLInputElement>(
        `input[name="purchase_option"][value="${groupId}"]`
      )
      this.updateHiddenInput(
        groupRadio ? groupRadio.dataset.defaultPlan : ''
      )
    }
  }

  updateHiddenInput(value?: string) {
    const hidden = this.querySelector<HTMLInputElement>(
      'input[name="selling_plan"]'
    )
    if (hidden) hidden.value = value as string
  }
}

window.customElements.define('selling-plan-picker', SellingPlanPicker)
