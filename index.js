'use strict';

const express = require('express');
const request = require('request');
const moment = require('moment');

const app = express();
app.set('trust proxy', true);

app.get('/channel/:channel', (req, res, next) => {
    const channel = req.params.channel;
    
    request(`https://api.twitch.tv/kraken/channels/${channel}/videos?limit=50&broadcasts=true`, (err, resp, body) => {
        const data = JSON.parse(body);
        if (!data.videos || !data.videos[0] || data.videos[0].status !== 'recording') {
           res.send('Offline\n').end();
           return;
        }
        

        const total = calculateDiff(data.videos, 5*60);
        const days = Math.floor(total/(60*24));
        const hours = Math.floor(total/60) - 24*days;
        const minutes = Math.floor(total % 60);
        
        let msg = [];
        if (days === 1)
            msg.push('1 day');
        else if (days > 1)
            msg.push(days + ' days');
        if (hours === 1)
            msg.push('1 hour');
        else if (hours > 1)
            msg.push(hours + ' hours');
        if (minutes === 1)
            msg.push('1 minute');
        else if (minutes > 1)
            msg.push(minutes + ' minutes');

        if (total === 0)
            msg = ['1 minute'];

        msg = msg.join(', ') + '\n';
        res.status(200).send(msg).end();
    });
});

function calculateDiff(videos, breakAllowance) {
    breakAllowance = breakAllowance || 0;

    let lastStart = moment(videos[0].recorded_at);
    let total = moment().diff(lastStart, 'seconds');
    for (let i = 1; i < videos.length; i++) {
        let video = videos[i];
        let vL = video.length;
        let vS = moment(video.recorded_at);
        let vE = vS.clone().add(vL, 'seconds');
        if (lastStart.diff(vE, 'seconds') <= breakAllowance) {
            total += vL;
            lastStart = vS;
        } else {
            break;
        }
    }

    return Math.floor(total/60);
}

app.use('/', express.static(`${__dirname}/static`));

app.listen(9091, () => console.log('Listening on port 9091'));
