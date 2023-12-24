/// <reference types="jquery" />

interface JQueryEventWithFix extends JQuery.EventExtensions {
	fix: (event: Event) => Event;
}
