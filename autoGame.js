const NAGETIVE_DIRECTION = {
    U: 'D',
    L: 'R',
    D: 'U',
    R: 'L',
};
const COLUMN = 6;
const OBSTACLE = 6;
const [cookie, uid] = process.argv.slice(2);
// const { cookie, uid } = require('./config');
const { Game } = require('./Game');

/**
 * @desc 一维数组转二维数组
 * @param {Array} arr 原数据
 * @param {Number} num 每个维度的元素数量
 */
function ArrayOneToTwo(arr, num) {
    let arrList = [];
    arr.map((item, index) => {
        if (index % num == 0) {
            arrList.push([item]);
        } else {
            arrList[arrList.length - 1].push(item);
        }
    });
    return arrList;
}

/**
 * @desc 计算行走轨迹
 * @param {Array} maps 地图
 */
const getTarck = (maps) => {
    const mapsTrack = [
        [3, 1, 'U'],
        [2, 2, 'L'],
        [4, 2, 'D'],
        [3, 3, 'R'],
    ];
    const mapsTree = ArrayOneToTwo(maps, COLUMN);

    // 过滤掉有障碍物的位置
    const trackXY = mapsTrack.filter((item) => {
        const xy = mapsTree[item[0]][item[1]];
        return xy !== OBSTACLE;
    });

    // 移动后反方向移动回初始位置
    const trackList = trackXY
        .map((item) => {
            return [item[2], NAGETIVE_DIRECTION[item[2]]];
        })
        .flat();
    return trackList;
};

let runNum = 0;
const autoGame = async () => {
    runNum++;
    if (runNum > 500) return; // 防止死循环
    let exp = new Game(uid, cookie);
    let gameData = await exp.openGame();
    console.log(gameData !== undefined ? 'Game Start🎮' : 'Game Start Error❌');
    if (!gameData) return;

    const { mapData } = gameData;
    const track = getTarck(mapData);
    exp.move(track)
        .then(() => {
            exp.outGame().then(async (res) => {
                res.body = JSON.parse(res.body);
                console.log(`Game over, Reward: ${res.body.data.realDiamond}, Today reward: ${res.body.data.todayDiamond}, Today limit reward: ${res.body.data.todayLimitDiamond}`);

                if (res.body.data.realDiamond < 40) {
                    // 奖励小于40刷新下地图
                    await exp.freshMap();
                }
                // 没达到今日上限继续自动游戏
                if (res.body.data.todayDiamond < res.body.data.todayLimitDiamond) {
                    setTimeout(() => {
                        autoGame();
                    }, 3000);
                } else {
                    console.log('今日奖励已达上限！');
                }
            });
        })
        .catch(() => {
            console.log('Game Error❌');
            setTimeout(() => {
                autoGame();
            }, 5000);
        });
};

exports.autoGame = autoGame;
