import { FunctionComponent } from 'preact';

export const Settings: FunctionComponent = () => {
  return (
    <div class="settings-buttons">
      <button class="settings-button">
        ✍🏻 Edit Categories
      </button>
      <button class="settings-button">
        💵 Show Expenses
      </button>
    </div>
  );
}; 