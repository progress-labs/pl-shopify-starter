/**
 * @file `<password-modal>` — storefront password entry modal.
 *
 * Extends {@link DetailsModal}. Automatically opens on construction if the
 * password input has `aria-invalid="true"` (server-side validation error).
 */
import DetailsModal from './details-modal'

class PasswordModal extends DetailsModal {
  constructor() {
    super()

    if (this.querySelector('input[aria-invalid="true"]'))
      this.open({ target: this.querySelector('details') })
  }
}

window.customElements.define('password-modal', PasswordModal)
