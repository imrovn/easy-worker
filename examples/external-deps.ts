import {createInlineWorker} from "../src";

const sortDates = (dates: Date[]) : Date[]=> {
    // @ts-ignore
    return dates.sort(dateFns.compareAsc);
};

const workerWithExternalLib = createInlineWorker(sortDates, {
    dependencies: ["https://cdnjs.cloudflare.com/ajax/libs/date-fns/1.30.1/date_fns.js"]
});

const dates: Date[] = [...Array(10000)].map(
    () => new Date(1995, Math.floor(Math.random() * 2000), 6, 2)
);

async function runWithExternalLib() {
    try {
        const sortedDates = await workerWithExternalLib(dates);
        console.log('Main: Sum from worker with options:', sortedDates);
    } catch (error) {
        console.error('Main: Worker with options error:', error);
    } finally {
        workerWithExternalLib.terminate();
    }
}

runWithExternalLib(); // Uncomment to run