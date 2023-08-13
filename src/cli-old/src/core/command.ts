export interface ICommand<OptionsType> {
    execute(options: OptionsType): Promise<void>;
}
