type WindowEvent = {start:string;end:string;allDay:boolean};
export function calendarDay(now:Date):string;
export function eventState(event:WindowEvent, now?:Date):'invalid'|'expired'|'upcoming'|'ongoing';
export function visibleEvent(event:WindowEvent, now?:Date):boolean;
export function dateRange(event:WindowEvent):string;
