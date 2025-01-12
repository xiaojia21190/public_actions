const fetch = require('node-fetch');
const pushPlus = require('./pushPlus');
const { autoGame } = require('./autoGame');
let [cookie, uid, push_plus_token, suoha] = process.argv.slice(2);
// let { cookie, uid, push_plus_token, suoha } = require('./config');
if (!cookie) {
    console.error('请填写掘金cookie');
    return;
}

if (!push_plus_token) {
    console.error('请填写push_plus_token');
    return;
}

if (!suoha) {
    // 默认不梭哈
    suoha = 0;
    console.log('没有填写suoha 默认为不梭哈');
}
// test
// process.env.push_plus_token = push_plus_token;
// process.env.suoha = suoha;

let score = 0;

const headers = {
    'content-type': 'application/json; charset=utf-8',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    'sec-ch-ua': '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    referer: 'https://juejin.cn/',
    accept: '*/*',
    cookie,
};

// 抽奖
const drawFn = async () => {
    // 查询今日是否有免费抽奖机会
    const today = await fetch('https://api.juejin.cn/growth_api/v1/lottery_config/get', {
        headers,
        method: 'GET',
        credentials: 'include',
    }).then((res) => res.json());

    if (today.err_no !== 0) return Promise.reject('已经签到！免费抽奖失败！');
    if (today.data.free_count === 0) return Promise.resolve('签到成功！今日已经免费抽奖！');

    // 免费抽奖
    const draw = await fetch('https://api.juejin.cn/growth_api/v1/lottery/draw', {
        headers,
        method: 'POST',
        credentials: 'include',
    }).then((res) => res.json());

    if (draw.err_no !== 0) return Promise.reject('已经签到！免费抽奖异常！');
    console.log(JSON.stringify(draw, null, 2));
    if (draw.data.lottery_type === 1) score += 66;
    return Promise.resolve(`签到成功！恭喜抽到：${draw.data.lottery_name}`);
};

const xiqi = async () => {
    const list = await fetch('https://api.juejin.cn/growth_api/v1/lottery_history/global_big', {
        headers,
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ page_no: 1, page_size: 5 }),
    }).then((res) => res.json());

    const res = await fetch('https://api.juejin.cn/growth_api/v1/lottery_lucky/dip_lucky', {
        headers,
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ lottery_history_id: list.data.lotteries[0].history_id }),
    }).then((res) => res.json());

    if (res.err_no !== 0) return Promise.reject('网络异常！');

    if (res.data.has_dip) return `今日已经沾过喜气！喜气值：${res.data.total_value}`;

    if (res.data.dip_action === 1) return `沾喜气成功！喜气值：${res.data.total_value}`;
};

// 梭哈 一次抽完
const allDarw = async () => {
    if (score < 200) {
        console.warn('分都不够想啥呢？');
        return '分都不够想啥呢？';
    }
    let award = {};
    let flag = true;

    console.log('开始梭哈！');
    while (flag) {
        if (score < 200) {
            console.log('梭哈结束！');
            console.table(award);
            flag = false;
            return award;
        }
        const result = await fetch('https://api.juejin.cn/growth_api/v1/lottery/draw', {
            headers,
            method: 'POST',
            credentials: 'include',
        }).then((res) => res.json());

        if (result.err_no !== 0) {
            console.log('梭哈结束！');
            console.table(award);
            flag = false;
            return award;
        }

        score -= 200;

        if (result.data.lottery_type === 1) score += 66;

        if (award[result.data.lottery_name]) award[result.data.lottery_name]++;
        else award[result.data.lottery_name] = 1;

        console.log(`获得：${result.data.lottery_name}`);
    }

    return award;
};

// 签到
(async () => {
     // 查询今日是否已经签到
    const today_status = await fetch('https://api.juejin.cn/growth_api/v1/get_today_status', {
        headers,
        method: 'GET',
        credentials: 'include',
    }).then((res) => res.json());

    if (today_status.err_no !== 0) return Promise.reject('签到失败！');
    if (today_status.data) return Promise.resolve('今日已经签到！');
    return Promise.resolve();
})()
    .then((msg) => {
        console.log(msg);
        return fetch('https://api.juejin.cn/growth_api/v1/get_cur_point', {
            headers,
            method: 'GET',
            credentials: 'include',
        }).then((res) => res.json());
    })
    .then(async (res) => {
        console.log(res);
        score = res.data;
        // 先去免费抽奖
        let msg = await drawFn();
        let msgxiqi = await xiqi();
//         await autoGame();
        let award;
        // 是否梭哈
        if (suoha) {
            award = await allDarw();
        }
        return {
            zxq: msgxiqi,
            meiri: msg,
            suohua: award || '没有相关配置',
        };
    })
    .then((data) => {
        console.log(data);

        return pushPlus(
            {
                title: '掘金',
                content: `
                        <h1 style="text-align: center">自动签到通知</h1>
                        <p style="text-indent: 2em">签到结果：${data.meiri}</p>
                        <p style="text-indent: 2em">沾喜气结果：${data.zxq}</p>
                        <p style="text-indent: 2em">梭哈结果：${JSON.stringify(data.suohua)}</p>
                        <p style="text-indent: 2em">当前积分：${score}</p><br/>
                        `,
            },
            push_plus_token
        ).catch(console.error);
    })
    .then(() => {
        console.log('PUSHPLUS发送成功！');
    })
    .catch((err) => {
        pushPlus(
            {
                title: '掘金',
                content: `
        <h1 style="text-align: center">自动签到通知</h1>
        <p style="text-indent: 2em">执行结果：${err}</p>
        <p style="text-indent: 2em">当前积分：${score}</p><br/>
        `,
            },
            push_plus_token
        ).catch(console.error);
    });
