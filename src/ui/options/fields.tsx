import type { ReactNode, SelectHTMLAttributes } from "react";
import { msg } from "@/shared/i18n";

export function HelpTooltip({ text }: { text: string }) {
  return (
    <span className="options-help">
      <button
        type="button"
        className="options-help__button"
        aria-label={msg("optHelpLinkText", "Help")}
      >
        ?
      </button>
      <span className="options-help__bubble">{text}</span>
    </span>
  );
}

export function ToggleField(props: {
  id: string;
  checked: boolean;
  label: string;
  help: string;
  onChange: (checked: boolean) => Promise<void> | void;
  children?: ReactNode;
}) {
  return (
    <div className="options-item">
      <div className="options-item__head">
        <label className="options-switch" htmlFor={props.id}>
          <input
            id={props.id}
            type="checkbox"
            checked={props.checked}
            onChange={(event) => void props.onChange(event.target.checked)}
          />
          <span className="options-switch__slider" />
        </label>
        <div className="options-item__content">
          <div className="options-item__title">
            <label htmlFor={props.id}>{props.label}</label>
            <HelpTooltip text={props.help} />
          </div>
          {props.children ? (
            <div className="options-item__body">{props.children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ControlField(props: {
  label: string;
  help: string;
  children: ReactNode;
}) {
  return (
    <div className="options-item options-item--control">
      <div className="options-item__title">
        <span>{props.label}</span>
        <HelpTooltip text={props.help} />
      </div>
      <div className="options-item__body">{props.children}</div>
    </div>
  );
}

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="options-select" {...props} />;
}
